import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { getFlowerEvolver, _resetFlowerEvolverForTests } from '../../../src/services/flowerEvolver';
import { SpeciesClient } from '../../../src/services/SpeciesClient';
import { SpeciesTrainer } from '../../../src/services/SpeciesTrainer';

// a classifier that differs from the built-in one but has the same layout
const tweaked = (json) => {
    const data = JSON.parse(json);
    data.som.weights[0] += 0.5;
    return JSON.stringify(data);
};

describe('SpeciesClient.fingerprint', () => {
    test.each([
        ['', '811c9dc5'],
        ['a', 'e40c292c'],
        ['foobar', 'bf9cf968'],
    ])('is FNV-1a 32 bit: %j', (text, expected) => {
        expect(SpeciesClient.fingerprint(text)).toBe(expected);
    });

    test('is different for different text', () => {
        expect(SpeciesClient.fingerprint('{"a":1}')).not.toBe(SpeciesClient.fingerprint('{"a":2}'));
    });
});

// The wasm does not extract exactly the same features twice. About a third of the flowers move a little
// (distances within a few hundredths) and rarely, about 1 in 350, a few pixels of the silhouette differ
// and the flower lands in a neighbouring species. Two classifications of one genome are for the same
// flower when their distances are close, the cell is not compared, and one pair is allowed to
// disagree so that a single outlier does not fail a test about something else.
const expectMostlySame = (pairs) => {
    const apart = pairs.filter(([a, b]) => Math.abs(a.distance - b.distance) >= 0.1);
    expect(apart.length).toBeLessThanOrEqual(1);
};

// Drawing flowers and extracting their features is real work, a loaded machine can take seconds for one test.
describe('SpeciesClient with a real FEService (same thread)', { timeout: 30000 }, () => {
    let fe;
    let client;
    let genomes;

    beforeEach(async () => {
        fe = await getFlowerEvolver();
        fe.setParams(new FEParams(32, 3, 6.0, 1.0));
        client = new SpeciesClient((method, args) => fe[method](...args));
        genomes = [];
        for(let i = 0; i < 4; ++i){
            genomes.push((await fe.makeFlower()).genome);
        }
    });

    afterEach(() => {
        _resetFlowerEvolverForTests();
    });

    describe('getModel', () => {
        test('is the classifier built into the wasm until another one is loaded', async () => {
            const model = await client.getModel();
            expect(model.custom).toBe(false);
            expect(model.json).toBe(fe.getTrainedSOM());
            expect(model.fp).toBe(SpeciesClient.fingerprint(model.json));
        });

        test('is the loaded classifier, and the built-in one again after loadSOM("")', async () => {
            const builtIn = await client.getModel();
            const custom = tweaked(builtIn.json);

            await client.loadSOM(custom);
            const loaded = await client.getModel();
            expect(loaded).toEqual({ json: custom, fp: SpeciesClient.fingerprint(custom), custom: true });
            expect(loaded.fp).not.toBe(builtIn.fp);

            await client.loadSOM('');
            expect(await client.getModel()).toEqual(builtIn);
        });
    });

    describe('classifying', () => {
        test('classify gives the cell and the distance, with the fingerprint of the classifier', async () => {
            const { match, fp } = await client.classify(genomes[0]);
            expect(match.x).toBeGreaterThanOrEqual(0);
            expect(match.y).toBeGreaterThanOrEqual(0);
            expect(match.distance).toBeGreaterThan(0);
            expect(fp).toBe((await client.getModel()).fp);
        });

        test('an unusable genome is a null match, not an error', async () => {
            expect((await client.classify('not json')).match).toBeNull();
        });

        test('classifyBatch has one match per genome, in order, null where the genome is unusable', async () => {
            const { matches, fp } = await client.classifyBatch([genomes[0], 'not json', genomes[1], '{"Other":1}']);
            expect(matches).toHaveLength(4);
            expect(matches[1]).toBeNull();
            expect(matches[3]).toBeNull();
            const singles = [(await client.classify(genomes[0])).match, (await client.classify(genomes[1])).match];
            expectMostlySame([[matches[0], singles[0]], [matches[2], singles[1]]]);
            expect(fp).toBe((await client.getModel()).fp);
        });

        test('a result carries the fingerprint of the classifier that produced it', async () => {
            const before = await client.classify(genomes[0]);
            const custom = tweaked((await client.getModel()).json);

            await client.loadSOM(custom);
            const after = await client.classify(genomes[0]);

            expect(after.fp).toBe(SpeciesClient.fingerprint(custom));
            expect(after.fp).not.toBe(before.fp);
        });
    });

    describe('what a classification depends on', () => {
        test('not on the parameters the FEService draws with, the features come from the genome', async () => {
            const stored = (await client.classifyBatch(genomes)).matches;
            fe.setParams(new FEParams(16, 5, 3.0, 0.5));
            const other = (await client.classifyBatch(genomes)).matches;
            expectMostlySame(other.map((match, i) => [match, stored[i]]));
        });

        // A change of the petals moves a flower in about 90% of the cases (measured), so one flower
        // proves nothing. With eight the chance that none of them moves is about one in a billion.
        test('but on the petals the genome carries, so the test above would notice a dependency', async () => {
            const flowers = [];
            for(let i = 0; i < 8; ++i){
                flowers.push((await fe.makeFlower()).genome);
            }
            const stored = (await client.classifyBatch(flowers)).matches;
            const otherPetals = flowers.map((genome) => {
                const data = JSON.parse(genome);
                data.Flower.petals.radius = 128;
                data.Flower.petals.numLayers += 2;
                return JSON.stringify(data);
            });
            const changed = (await client.classifyBatch(otherPetals)).matches;
            const moved = changed.filter((match, i) => Math.abs(match.distance - stored[i].distance) > 0.1);
            expect(moved.length).toBeGreaterThan(0);
        });
    });

    describe('classifyBatchWith', () => {
        test('classifies with the other classifier, says its fingerprint, and puts the one in use back', async () => {
            const main = await client.getModel();
            const features = await client.extractFeatures(genomes);
            const sub = SpeciesTrainer.initialSubmapJson(main.json, 2, 1, features, () => 0);

            const { matches, fp } = await client.classifyBatchWith(sub, genomes);

            expect(fp).toBe(SpeciesClient.fingerprint(sub));
            expect(matches).toHaveLength(genomes.length);
            expect(matches.every((match) => match !== null && match.y === 0 && match.x >= 0 && match.x <= 1)).toBe(true);
            expect(await client.getModel()).toEqual(main);
        });

        test('puts a fine-tuned classifier back too, not the built-in one', async () => {
            const tuned = tweaked((await client.getModel()).json);
            await client.loadSOM(tuned);
            const features = await client.extractFeatures(genomes);
            const sub = SpeciesTrainer.initialSubmapJson(tuned, 2, 1, features, () => 0);

            await client.classifyBatchWith(sub, genomes);

            expect(await client.getModel()).toMatchObject({ custom: true, json: tuned });
        });
    });

    describe('features', () => {
        test('extractFeatures keeps the position of every genome, null where it is unusable', async () => {
            const features = await client.extractFeatures([genomes[0], 'not json', genomes[1]]);
            expect(features).toHaveLength(3);
            expect(features[1]).toBeNull();
            expect(features[0].length).toBeGreaterThan(0);
        });

        test('classifyFeatures gives what classifyBatch gives for the same genomes', async () => {
            const features = await client.extractFeatures(genomes);
            const fromFeatures = await client.classifyFeatures(features);
            const fromGenomes = await client.classifyBatch(genomes);
            expect(fromFeatures.fp).toBe(fromGenomes.fp);
            expect(fromFeatures.matches).toHaveLength(fromGenomes.matches.length);
            expectMostlySame(fromFeatures.matches.map((match, i) => [match, fromGenomes.matches[i]]));
        });

        test('fineTuneFeatures replaces the classifier and the fingerprint follows', async () => {
            const features = await client.extractFeatures(genomes);
            const before = await client.getModel();

            await client.fineTuneFeatures(features, 1, 0.1, 1.0);

            const after = await client.getModel();
            expect(after.custom).toBe(true);
            expect(after.fp).not.toBe(before.fp);
            expect((await client.classifyFeatures(features)).fp).toBe(after.fp);
        });

        test('evaluateFeatures measures the classifier in use over the vectors', async () => {
            const features = await client.extractFeatures(genomes);
            const evaluation = await client.evaluateFeatures(features);
            expect(evaluation.samplesUsed).toBe(genomes.length);
            expect(Number.isFinite(evaluation.meanQuantizationError)).toBe(true);
        });
    });
});

describe('SpeciesClient queue, sessions and fingerprint (controllable transport)', () => {
    // every call waits until the test lets it finish, getSOM answers with the current classifier
    let classifier;
    let log;
    let gates;
    let transport;
    let client;

    const gate = () => {
        let open;
        const promise = new Promise((resolve) => {
            open = resolve;
        });
        return { promise, open };
    };
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
        classifier = '{"classifier":"one"}';
        log = [];
        gates = new Map();
        transport = vi.fn(async (method, args) => {
            log.push(method);
            await gates.get(method)?.promise;
            switch(method){
                case 'getSOM': return classifier;
                case 'getTrainedSOM': return '{"classifier":"built-in"}';
                case 'loadSOM': classifier = args[0]; return undefined;
                case 'classify': return { x: 1, y: 2, distance: 3 };
                default: return undefined;
            }
        });
        client = new SpeciesClient(transport);
    });

    describe('queue', () => {
        test('runs one call at a time, in the order they were made', async () => {
            gates.set('classifyFeatures', gate());
            gates.set('evaluateFeatures', gate());
            const first = client.classifyFeatures([]);
            const second = client.evaluateFeatures([]);

            await tick();
            expect(log).toEqual(['classifyFeatures']);

            gates.get('classifyFeatures').open();
            await first;
            await tick();
            expect(log).toEqual(['classifyFeatures', 'getSOM', 'evaluateFeatures']);

            gates.get('evaluateFeatures').open();
            await second;
        });

        test('a call that fails does not stop the ones behind it', async () => {
            transport.mockImplementationOnce(async () => {
                throw new Error('boom');
            });
            const failing = client.evaluateFeatures([]);
            const next = client.classify('{}');

            await expect(failing).rejects.toThrow('boom');
            expect((await next).match).toEqual({ x: 1, y: 2, distance: 3 });
        });

        test('a transport that throws at once still gives a rejected promise', async () => {
            transport.mockImplementation(() => {
                throw new Error('sync boom');
            });
            await expect(client.evaluateFeatures([])).rejects.toThrow('sync boom');
            await expect(client.session((run) => run.evaluateFeatures([]))).rejects.toThrow('sync boom');
        });
    });

    describe('session', () => {
        test('others wait for the session to end, its own calls run at once', async () => {
            const hold = gate();
            const inSession = client.session(async (run) => {
                await run.evaluateFeatures([]);
                await hold.promise;
                await run.evaluateFeatures([]);
                return 'done';
            });
            const outside = client.classify('{}');

            await tick();
            expect(log).toEqual(['evaluateFeatures']);

            hold.open();
            expect(await inSession).toBe('done');
            await outside;
            expect(log).toEqual(['evaluateFeatures', 'evaluateFeatures', 'classify', 'getSOM']);
        });

        test('what it returns, or fails with, reaches the caller and frees the queue', async () => {
            await expect(client.session(async () => {
                throw new Error('session failed');
            })).rejects.toThrow('session failed');
            expect((await client.classify('{}')).match).toEqual({ x: 1, y: 2, distance: 3 });
        });

        test('swapping the classifier inside a session is seen by the next call outside it', async () => {
            const before = await client.classify('{}');
            await client.session(async (run) => {
                await run.loadSOM('{"classifier":"sub-map"}');
                await run.loadSOM('{"classifier":"two"}');
            });
            const after = await client.classify('{}');

            expect(before.fp).toBe(SpeciesClient.fingerprint('{"classifier":"one"}'));
            expect(after.fp).toBe(SpeciesClient.fingerprint('{"classifier":"two"}'));
        });
    });

    describe('fingerprint', () => {
        test('is read once and kept while the classifier does not change', async () => {
            await client.classify('{}');
            await client.classify('{}');
            await client.classifyBatch(['{}']);
            expect(log.filter((m) => m === 'getSOM')).toHaveLength(1);
        });

        test('is read again after loadSOM and after fineTuneFeatures', async () => {
            await client.classify('{}');
            await client.loadSOM('{"classifier":"two"}');
            await client.classify('{}');
            await client.fineTuneFeatures([], 1, 0.1, 1);
            await client.classify('{}');
            expect(log.filter((m) => m === 'getSOM')).toHaveLength(3);
        });

        test('is read again after a loadSOM that failed, the classifier may have changed', async () => {
            await client.classify('{}');
            transport.mockImplementationOnce(async () => {
                throw new Error('bad classifier');
            });
            await expect(client.loadSOM('garbage')).rejects.toThrow('bad classifier');
            await client.classify('{}');
            expect(log.filter((m) => m === 'getSOM')).toHaveLength(2);
        });

        test('falls back to the built-in classifier when none was loaded', async () => {
            classifier = '';
            const { fp } = await client.classify('{}');
            expect(fp).toBe(SpeciesClient.fingerprint('{"classifier":"built-in"}'));
        });
    });

    describe('genomes', () => {
        test('are sent as {"Generation": [...]} with an unusable genome as null, keeping every position', async () => {
            await client.classifyBatch(['{"Flower":{"a":1}}', 'not json', '{"Other":1}', '{"Flower":{"b":2}}']);
            expect(transport).toHaveBeenCalledWith('classifyBatch', ['{"Generation":[{"a":1},null,null,{"b":2}]}']);

            await client.extractFeatures(['{"Flower":{"a":1}}']);
            expect(transport).toHaveBeenCalledWith('extractFeatures', ['{"Generation":[{"a":1}]}']);
        });
    });
});
