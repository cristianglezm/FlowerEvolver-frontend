import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { db } from '../../../src/stores/FlowerStore/db';
import { getFlowerEvolver, _resetFlowerEvolverForTests } from '../../../src/services/flowerEvolver';
import { SpeciesClient } from '../../../src/services/SpeciesClient';
import { SpeciesTrainer } from '../../../src/services/SpeciesTrainer';
import * as flowerRepository from '../../../src/services/flowerRepository';

const BUILT_IN = '{"builtIn":true}';
const flowerWith = (v) => JSON.stringify({ Flower: { v } });
const store = (...genomes) => flowerRepository.bulkAddFlowers(genomes.map((genome, i) => ({ id: i + 1, genome, image: 'i' })));
const gate = () => {
    let open;
    const promise = new Promise((resolve) => {
        open = resolve;
    });
    return { promise, open };
};

// What is needed of an FEService, made of numbers: a flower is { v }, its features are [v] and a
// flower without v cannot be classified. Every epoch lowers the distance by 0.1.
const makeFe = () => {
    const fe = {
        classifier: '',
        epochs: 0,
        log: [],
        getSOM: () => fe.classifier,
        getTrainedSOM: () => BUILT_IN,
        loadSOM: (json) => {
            fe.log.push(['loadSOM', json]);
            fe.classifier = json;
        },
        extractFeatures: (generation) => {
            return JSON.parse(generation).Generation.map((flower) => flower === null || flower.v === undefined ? null : [flower.v]);
        },
        evaluateFeatures: (features) => ({
            meanQuantizationError: 1 - 0.1 * fe.epochs, samplesUsed: features.length, samplesSkipped: 0,
            totalNodes: 4, usedNodes: 2, fractionUsed: 0.5, busiestNodeCount: features.length, samplesPerNodeMean: 1,
            nodeCounts: [features.length, 0, 0, 0],
        }),
        fineTuneFeatures: (features, epochs, lr, radius, offset, total) => {
            fe.log.push(['fineTuneFeatures', features, epochs, lr, radius, offset, total]);
            ++fe.epochs;
            fe.classifier = `{"tuned":${fe.epochs}}`;
        },
        classify: () => ({ x: 0, y: 0, distance: 1 }),
        classifyFeatures: (features) => features.map((vector) => vector === null ? null : { x: vector[0] % 2, y: 0, distance: 1 }),
    };
    return fe;
};

describe('SpeciesTrainer.fineTune', () => {
    let fe;
    let client;
    let trainer;
    const params = { epochs: 2, baseLR: 0.3, baseRadius: 1 };

    beforeEach(async () => {
        await db.delete();
        await db.open();
        fe = makeFe();
        client = new SpeciesClient((method, args) => fe[method](...args));
        trainer = new SpeciesTrainer(client);
    });

    describe('parameters', () => {
        test.each([
            ['no epochs', { epochs: 0 }],
            ['half an epoch', { epochs: 1.5 }],
            ['epochs that are not a number', { epochs: NaN }],
            ['a learning rate of 0', { baseLR: 0 }],
            ['a negative learning rate', { baseLR: -0.1 }],
            ['a learning rate that is not a number', { baseLR: NaN }],
            ['an infinite learning rate', { baseLR: Infinity }],
            ['a radius of 0', { baseRadius: 0 }],
            ['a radius that is not a number', { baseRadius: undefined }],
        ])('refuses %s before touching anything', async (_, bad) => {
            await store(flowerWith(1));

            await expect(trainer.fineTune({ ...params, ...bad })).rejects.toThrow(RangeError);

            expect(fe.log).toEqual([]);
        });
    });

    describe('when there is nothing to fine-tune on', () => {
        test('there are no flowers: nothing is changed', async () => {
            expect(await trainer.fineTune(params)).toEqual({ outcome: 'no-flowers' });
            expect(fe.log).toEqual([]);
        });

        test('none of the flowers can be classified: nothing is changed', async () => {
            await store('not json', '{"Flower":{}}');

            expect(await trainer.fineTune(params)).toEqual({ outcome: 'unusable' });
            expect(fe.log).toEqual([]);
        });
    });

    describe('a run', () => {
        beforeEach(async () => {
            // the second cannot be classified
            await store(flowerWith(1), 'not json', flowerWith(3));
        });

        test('trains one epoch at a time on the flowers that can be classified, with the progress of the epoch', async () => {
            await trainer.fineTune({ ...params, epochs: 3 });

            expect(fe.log.filter(([name]) => name === 'fineTuneFeatures')).toEqual([
                ['fineTuneFeatures', [[1], [3]], 1, 0.3, 1, 0, 3],
                ['fineTuneFeatures', [[1], [3]], 1, 0.3, 1, 1, 3],
                ['fineTuneFeatures', [[1], [3]], 1, 0.3, 1, 2, 3],
            ]);
        });

        test('gives the classifier before and after, and what to save: the new classifier and where every flower is', async () => {
            const result = await trainer.fineTune(params);

            expect(result.outcome).toBe('done');
            expect(result.epochs).toBe(2);
            expect(result.flowers).toBe(2);
            expect(result.before.meanQuantizationError).toBe(1);
            expect(result.after.meanQuantizationError).toBeCloseTo(0.8);
            expect(result.model).toEqual({ json: '{"tuned":2}', fp: SpeciesClient.fingerprint('{"tuned":2}') });
            expect(result.rows).toEqual([
                { id: 1, hash: SpeciesClient.fingerprint(flowerWith(1)), fp: result.model.fp, match: { x: 1, y: 0, distance: 1 } },
                { id: 2, hash: SpeciesClient.fingerprint('not json'), fp: result.model.fp, match: null },
                { id: 3, hash: SpeciesClient.fingerprint(flowerWith(3)), fp: result.model.fp, match: { x: 1, y: 0, distance: 1 } },
            ]);
        });

        test('says how far it is: the flowers read, the classifier before, and each epoch', async () => {
            const onProgress = vi.fn();

            await trainer.fineTune({ ...params, onProgress });

            expect(onProgress.mock.calls.map(([event]) => [event.phase, event.done, event.total, event.evaluation?.meanQuantizationError])).toEqual([
                ['preparing', 0, 3, undefined],
                ['training', 0, 2, 1],
                ['training', 1, 2, 0.9],
                ['training', 2, 2, 0.8],
            ]);
        });

        test('reads the flowers in batches of 25', async () => {
            await db.flowers.clear();
            await store(...Array.from({ length: 60 }, (_, i) => flowerWith(i)));
            const onProgress = vi.fn();

            await trainer.fineTune({ ...params, epochs: 1, onProgress });

            expect(onProgress.mock.calls.filter(([event]) => event.phase === 'preparing').map(([event]) => [event.done, event.total])).toEqual([
                [0, 60], [25, 60], [50, 60],
            ]);
        });

        test('keeps everyone else out of the classifier until it is done', async () => {
            const hold = gate();
            const order = [];
            const transport = fe.fineTuneFeatures;
            fe.fineTuneFeatures = async (...args) => {
                order.push('epoch');
                await hold.promise;
                return transport(...args);
            };
            fe.classifyFeatures = (features) => {
                order.push('classify features');
                return features.map(() => null);
            };
            fe.getSOM = () => {
                order.push('getSOM');
                return fe.classifier;
            };

            const running = trainer.fineTune({ ...params, epochs: 1 });
            await vi.waitFor(() => expect(order).toContain('epoch'));
            const outside = client.classify('{"Flower":{"v":1}}').then(() => order.push('outside'));
            hold.open();
            await running;
            await outside;

            expect(order.indexOf('outside')).toBeGreaterThan(order.indexOf('classify features'));
        });
    });

    describe('cancelling', () => {
        beforeEach(async () => {
            await store(flowerWith(1), flowerWith(2));
        });

        test('before it started changes nothing', async () => {
            const controller = new AbortController();
            controller.abort();

            expect(await trainer.fineTune({ ...params, signal: controller.signal })).toEqual({ outcome: 'cancelled' });
            expect(fe.log).toEqual([]);
        });

        test('between epochs puts the built-in classifier back', async () => {
            const controller = new AbortController();

            const result = await trainer.fineTune({
                epochs: 5, baseLR: 0.3, baseRadius: 1, signal: controller.signal,
                onProgress: ({ phase, done }) => {
                    if(phase === 'training' && done === 2){
                        controller.abort();
                    }
                },
            });

            expect(result).toEqual({ outcome: 'cancelled' });
            expect(fe.log.filter(([name]) => name === 'fineTuneFeatures')).toHaveLength(2);
            expect(fe.classifier).toBe('');
        });

        test('between epochs puts back the classifier that was fine-tuned before, not the built-in one', async () => {
            fe.classifier = '{"mine":1}';
            const controller = new AbortController();

            await trainer.fineTune({
                ...params, epochs: 3, signal: controller.signal,
                onProgress: ({ phase, done }) => {
                    if(phase === 'training' && done === 1){
                        controller.abort();
                    }
                },
            });

            expect(fe.classifier).toBe('{"mine":1}');
        });
    });

    describe('when something fails', () => {
        beforeEach(async () => {
            await store(flowerWith(1), flowerWith(2));
        });

        test('the classifier that was in use is put back and the error is thrown', async () => {
            fe.classifier = '{"mine":1}';
            const failure = new Error('wasm trapped');
            const transport = fe.fineTuneFeatures;
            fe.fineTuneFeatures = (...args) => {
                if(fe.epochs === 1){
                    throw failure;
                }
                return transport(...args);
            };

            await expect(trainer.fineTune({ ...params, epochs: 3 })).rejects.toBe(failure);

            expect(fe.classifier).toBe('{"mine":1}');
        });

        test('what it could not put back does not hide the error that came first', async () => {
            const failure = new Error('wasm trapped');
            fe.evaluateFeatures = () => {
                throw failure;
            };
            fe.loadSOM = () => {
                throw new Error('and neither could it be put back');
            };

            await expect(trainer.fineTune(params)).rejects.toBe(failure);
        });
    });
});

describe('SpeciesTrainer.split', () => {
    let fe;
    let trainer;
    // the flowers 1 to 6 have the features [1] to [6]; 7 and 8 are other flowers, 9 cannot be classified, 10 is one more
    const flowers = [1, 2, 3, 4, 5, 6, 7, 8].map(flowerWith).concat('not json', flowerWith(10));
    const six = [1, 2, 3, 4, 5, 6];
    const params = { width: 2, height: 1, epochs: 2, ids: six, random: () => 0 };

    beforeEach(async () => {
        await db.delete();
        await db.open();
        fe = makeFe();
        trainer = new SpeciesTrainer(new SpeciesClient((method, args) => fe[method](...args)));
        await store(...flowers);
    });

    test.each([
        ['no columns', { width: 0 }],
        ['more than 6 columns', { width: 7 }],
        ['half a row', { height: 1.5 }],
        ['a single cell', { width: 1, height: 1 }],
        ['no epochs', { epochs: 0 }],
    ])('refuses %s before touching anything', async (_, bad) => {
        await expect(trainer.split({ ...params, ...bad })).rejects.toThrow(RangeError);

        expect(fe.log).toEqual([]);
    });

    test('says how many flowers it needs, 3 for every cell, without reading them', async () => {
        const result = await trainer.split({ ...params, ids: [1, 2, 3, 4, 5] });

        expect(result).toEqual({ outcome: 'too-few', flowers: 5, needed: 6 });
        expect(fe.log).toEqual([]);
    });

    test('counts only the flowers that can be classified, and leaves the classifier as it was', async () => {
        const result = await trainer.split({ ...params, ids: [1, 2, 3, 4, 9, 9] });

        expect(result).toEqual({ outcome: 'too-few', flowers: 4, needed: 6 });
        expect(fe.classifier).toBe('');
    });

    test('none that can be classified is unusable', async () => {
        expect(await trainer.split({ ...params, ids: [9, 9, 9, 9, 9, 9] })).toEqual({ outcome: 'unusable' });
        expect(fe.classifier).toBe('');
    });

    test('trains a small map that is not toroidal on the flowers of the ids only, one epoch at a time', async () => {
        const progress = [];

        const result = await trainer.split({ ...params, onProgress: (event) => progress.push([event.phase, event.done, event.total]) });

        const loaded = JSON.parse(fe.log.find(([name, json]) => name === 'loadSOM' && json !== '')[1]);
        expect(loaded.som).toMatchObject({ width: '2', height: '1', inputDim: '1', toroidal: false });
        expect(loaded.som.weights).toHaveLength(2);
        // every prototype starts as one of the flowers of the species, and no other flower is read
        expect(loaded.som.weights.every((w) => six.includes(w))).toBe(true);
        const trained = fe.log.filter(([name]) => name === 'fineTuneFeatures');
        expect(trained.map(([, features, epochs, lr, radius, offset, total]) => [features.length, epochs, lr, radius, offset, total])).toEqual([
            [6, 1, 0.5, 1, 0, 2], [6, 1, 0.5, 1, 1, 2],
        ]);
        expect(trained[0][1].flat().sort()).toEqual(six);
        expect(progress.filter(([phase]) => phase === 'training')).toEqual([['training', 0, 2], ['training', 1, 2], ['training', 2, 2]]);
        expect(result).toMatchObject({ outcome: 'done', epochs: 2, flowers: 6, width: 2, height: 1 });
        expect(result.model.json).toBe('{"tuned":2}');
        expect(result.rows.map((row) => row.id)).toEqual(six);
        expect(new Set(result.rows.map((row) => row.sfp))).toEqual(new Set([result.model.fp]));
        expect(result.rows[0].hash).toBe(SpeciesClient.fingerprint(flowerWith(1)));
    });

    test('puts the classifier in use back when it is done: the map is returned, not left loaded', async () => {
        await trainer.split(params);

        expect(fe.classifier).toBe('');
    });

    test('puts a fine-tuned classifier back, not the built-in one', async () => {
        fe.classifier = '{"mine":true}';

        await trainer.split(params);

        expect(fe.classifier).toBe('{"mine":true}');
    });

    test('the radius is half the longest side, also when it is the rows', async () => {
        await trainer.split({ ...params, width: 1, height: 3, ids: [1, 2, 3, 4, 5, 6, 7, 8, 10] });

        expect(fe.log.filter(([name]) => name === 'fineTuneFeatures').map((call) => call[4])).toEqual([1.5, 1.5]);
    });

    test('a map of 3 by 2 needs 18 flowers', async () => {
        expect(await trainer.split({ ...params, width: 3, height: 2 })).toEqual({ outcome: 'too-few', flowers: 6, needed: 18 });
    });

    test('cancelled between epochs: nothing is returned and the classifier is back', async () => {
        const controller = new AbortController();

        const result = await trainer.split({
            ...params, epochs: 4, signal: controller.signal,
            onProgress: ({ phase, done }) => {
                if(phase === 'training' && done === 1){
                    controller.abort();
                }
            },
        });

        expect(result).toEqual({ outcome: 'cancelled' });
        expect(fe.log.filter(([name]) => name === 'fineTuneFeatures')).toHaveLength(1);
        expect(fe.classifier).toBe('');
    });

    test('cancelled while reading the flowers', async () => {
        const controller = new AbortController();
        controller.abort();

        expect(await trainer.split({ ...params, signal: controller.signal })).toEqual({ outcome: 'cancelled' });
        expect(fe.classifier).toBe('');
    });

    test('a failure puts the classifier back and is thrown', async () => {
        fe.fineTuneFeatures = () => {
            throw new Error('wasm failed');
        };

        await expect(trainer.split(params)).rejects.toThrow('wasm failed');
        expect(fe.classifier).toBe('');
    });
});

describe('SpeciesTrainer.fineTune with a real FEService (same thread)', { timeout: 60000 }, () => {
    let fe;
    let client;
    let trainer;

    beforeEach(async () => {
        await db.delete();
        await db.open();
        fe = await getFlowerEvolver();
        fe.setParams(new FEParams(32, 3, 6.0, 1.0));
        client = new SpeciesClient((method, args) => fe[method](...args));
        trainer = new SpeciesTrainer(client);
        const genomes = [];
        for(let i = 0; i < 5; ++i){
            genomes.push((await fe.makeFlower()).genome);
        }
        await store(...genomes);
    });

    afterEach(() => {
        _resetFlowerEvolverForTests();
    });

    test('replaces the classifier and gives a row for every flower, for the classifier it made', async () => {
        const builtIn = await client.getModel();

        const result = await trainer.fineTune({ epochs: 2, baseLR: 0.3, baseRadius: 1 });

        expect(result.outcome).toBe('done');
        expect(result.flowers).toBe(5);
        expect(result.model.fp).not.toBe(builtIn.fp);
        expect(result.rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
        expect(new Set(result.rows.map((row) => row.fp))).toEqual(new Set([result.model.fp]));
        expect(result.rows.every((row) => row.match !== null && Number.isFinite(row.match.distance))).toBe(true);
        const now = await client.getModel();
        expect(now).toMatchObject({ custom: true, fp: result.model.fp, json: result.model.json });
        expect(Number.isFinite(result.before.meanQuantizationError)).toBe(true);
        expect(Number.isFinite(result.after.meanQuantizationError)).toBe(true);
    });

    test('cancelled, the classifier built into the wasm is back as it was', async () => {
        const builtIn = await client.getModel();
        const controller = new AbortController();

        const result = await trainer.fineTune({
            epochs: 4, baseLR: 0.3, baseRadius: 1, signal: controller.signal,
            onProgress: ({ phase, done }) => {
                if(phase === 'training' && done === 1){
                    controller.abort();
                }
            },
        });

        expect(result).toEqual({ outcome: 'cancelled' });
        expect(await client.getModel()).toEqual(builtIn);
    });

    test('splits a species with the real wasm: a map of its own, and the classifier in use is back', async () => {
        const more = [];
        for(let i = 0; i < 3; ++i){
            more.push((await fe.makeFlower()).genome);
        }
        await flowerRepository.bulkAddFlowers(more.map((genome, i) => ({ id: 6 + i, genome, image: 'i' })));
        const builtIn = await client.getModel();

        const result = await trainer.split({ width: 2, height: 1, epochs: 2, ids: [1, 2, 3, 4, 5, 6, 7, 8] });

        expect(result.outcome).toBe('done');
        expect(result.flowers).toBe(8);
        expect(result.model.fp).not.toBe(builtIn.fp);
        expect(JSON.parse(result.model.json).som).toMatchObject({ width: '2', height: '1', toroidal: false });
        expect(result.rows.every((row) => row.match !== null && row.match.y === 0 && row.match.x <= 1)).toBe(true);
        expect(await client.getModel()).toEqual(builtIn);
    });
});

afterAll(async () => {
    await db.close();
});
