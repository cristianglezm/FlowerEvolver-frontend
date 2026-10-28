import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterAll, afterEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { db } from '../../../src/stores/FlowerStore/db';
import { useSpeciesStore, _resetSpeciesStoreForTests } from '../../../src/stores/SpeciesStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { getSpeciesClient } from '../../../src/services/speciesWorker';
import { SpeciesClient } from '../../../src/services/SpeciesClient';
import { SpeciesTrainer } from '../../../src/services/SpeciesTrainer';
import * as flowerRepository from '../../../src/services/flowerRepository';
import * as speciesRepository from '../../../src/services/speciesRepository';
import { classifierJson } from '../helpers/classifier';

// What is slow and needs the wasm, the classifier, is the one thing that is not real here: the
// client answers from the genome, '{"cell":[1,0],"d":0.5}' is in cell (1, 0) at distance 0.5 and
// '{}' cannot be classified. Dexie is the real one (fake-indexeddb), what the store does to the
// tables is what is being tested.
vi.mock('../../../src/services/speciesWorker', () => ({
    getSpeciesClient: vi.fn(),
}));

// What the trainer does is tested with the trainer, here it answers what the test says.
vi.mock('../../../src/services/SpeciesTrainer', () => ({
    SpeciesTrainer: vi.fn(),
}));

const genomeIn = (x, y, d = 1, sub = undefined) => JSON.stringify({ cell: [x, y], d, sub });
const matchOf = (genome) => {
    const { cell, d } = JSON.parse(genome);
    return cell === undefined ? null : { x: cell[0], y: cell[1], distance: d };
};
const makeClient = (overrides = {}) => ({
    loadSOM: vi.fn(async () => {}),
    getModel: vi.fn(async () => ({ json: classifierJson(), fp: 'fp1', custom: false })),
    classifyBatch: vi.fn(async (genomes) => ({ matches: genomes.map(matchOf), fp: 'fp1' })),
    // a sub-species map answers from the genome too: '{"sub":[1,0]}' is the sub-species (1, 0)
    classifyBatchWith: vi.fn(async (json, genomes) => ({
        matches: genomes.map((genome) => {
            const { sub, d } = JSON.parse(genome);
            return sub === undefined ? null : { x: sub[0], y: sub[1], distance: d };
        }),
        fp: 'sub:' + json,
    })),
    ...overrides,
});
const gate = () => {
    let open;
    const promise = new Promise((resolve) => {
        open = resolve;
    });
    return { promise, open };
};
const addFlowers = (...genomes) => flowerRepository.bulkAddFlowers(genomes.map((genome, i) => ({ id: i + 1, genome, image: 'i' })));

describe('SpeciesStore', () => {
    let SpeciesStore;
    let ErrorStore;
    let client;
    let warn;

    beforeEach(async () => {
        if(db.isOpen()){
            await db.delete();
        }
        await db.open();
        _resetSpeciesStoreForTests();
        vi.clearAllMocks();
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        createTestingPinia({ stubActions: false, createSpy: vi.fn });
        SpeciesStore = useSpeciesStore();
        ErrorStore = useErrorStore();
        client = makeClient();
        getSpeciesClient.mockReturnValue(client);
    });

    afterEach(() => {
        warn.mockRestore();
    });

    afterAll(async () => {
        await db.close();
    });

    describe('start', () => {
        test('puts the built-in classifier in use', async () => {
            await SpeciesStore.start();

            expect(SpeciesStore.isReady).toBe(true);
            expect(SpeciesStore.fp).toBe('fp1');
            expect(SpeciesStore.hasTuned).toBe(false);
            expect(SpeciesStore.model.width).toBe(2);
            expect(client.loadSOM).not.toHaveBeenCalled();
        });

        test('is done once, however many ask', async () => {
            await Promise.all([SpeciesStore.start(), SpeciesStore.start()]);
            await SpeciesStore.start();
            expect(client.getModel).toHaveBeenCalledTimes(1);
        });

        test('puts the fine-tuned classifier in use when there is one', async () => {
            const tuned = classifierJson({ toroidal: false });
            await speciesRepository.putClassifier({ id: 'tuned', json: tuned });
            client.getModel.mockResolvedValue({ json: tuned, fp: 'tunedfp', custom: true });

            await SpeciesStore.start();

            expect(client.loadSOM).toHaveBeenCalledWith(tuned);
            expect(SpeciesStore.fp).toBe('tunedfp');
            expect(SpeciesStore.hasTuned).toBe(true);
            expect(SpeciesStore.model.toroidal).toBe(false);
        });

        test('uses the built-in classifier and says so when the fine-tuned one is broken, and keeps it', async () => {
            await speciesRepository.putClassifier({ id: 'tuned', json: '{"broken":true}' });
            client.getModel
                .mockResolvedValueOnce({ json: '{"broken":true}', fp: 'brokenfp', custom: true })
                .mockResolvedValue({ json: classifierJson(), fp: 'fp1', custom: false });

            await SpeciesStore.start();

            expect(ErrorStore.push).toHaveBeenCalledWith("couldn't load the fine-tuned classifier, the built-in one is used.");
            expect(client.loadSOM).toHaveBeenLastCalledWith('');
            expect(SpeciesStore.fp).toBe('fp1');
            expect(SpeciesStore.hasTuned).toBe(false);
            // it is not the store's to delete what the person made
            expect((await speciesRepository.getClassifier('tuned')).json).toBe('{"broken":true}');
        });

        test('fails when the worker does, and can be asked again', async () => {
            client.getModel.mockRejectedValueOnce(new Error('worker failed'));
            await expect(SpeciesStore.start()).rejects.toThrow('worker failed');
            expect(SpeciesStore.isReady).toBe(false);

            await SpeciesStore.start();
            expect(SpeciesStore.isReady).toBe(true);
        });
    });

    describe('loadSaved', () => {
        test('knows if there is a fine-tuned classifier without starting the worker', async () => {
            await SpeciesStore.loadSaved();
            expect(SpeciesStore.hasTuned).toBe(false);

            await speciesRepository.putClassifier({ id: 'tuned', json: '{}' });
            await SpeciesStore.loadSaved();
            expect(SpeciesStore.hasTuned).toBe(true);
            expect(getSpeciesClient).not.toHaveBeenCalled();
        });
    });

    describe('classifyLater', () => {
        test('stores the cell and the distance of the flower for the classifier that answered', async () => {
            await addFlowers(genomeIn(1, 0, 0.5));

            await SpeciesStore.classifyLater(1);

            expect(await speciesRepository.getSpecies(1)).toEqual({ id: 1, x: 1, y: 0, d: 0.5, fp: 'fp1' });
            expect(SpeciesStore.rowFor(1)).toEqual({ id: 1, x: 1, y: 0, d: 0.5, fp: 'fp1' });
        });

        test('keeps a row for a flower that cannot be classified, so it is not asked for again, and it has no species', async () => {
            await addFlowers('{}');

            await SpeciesStore.classifyLater(1);

            expect(await speciesRepository.getSpecies(1)).toEqual({ id: 1, x: null, y: null, d: null, fp: 'fp1' });
            expect(SpeciesStore.rowFor(1)).toBeUndefined();
        });

        test('a row of another classifier is not the species of the flower', async () => {
            await addFlowers(genomeIn(1, 0));
            client.classifyBatch.mockResolvedValue({ matches: [{ x: 1, y: 0, distance: 1 }], fp: 'someone-elses' });

            await SpeciesStore.classifyLater(1);

            expect((await speciesRepository.getSpecies(1)).fp).toBe('someone-elses');
            expect(SpeciesStore.rowFor(1)).toBeUndefined();
        });

        test('a flower that was deleted before its turn is not classified', async () => {
            await addFlowers(genomeIn(1, 0), genomeIn(0, 1));
            await db.flowers.delete(1);

            await SpeciesStore.enqueue([1, 2]);

            expect(client.classifyBatch).toHaveBeenCalledTimes(1);
            expect(client.classifyBatch.mock.calls[0][0]).toEqual([genomeIn(0, 1)]);
            expect(await speciesRepository.getSpecies(1)).toBeUndefined();
            expect(await speciesRepository.getSpecies(2)).toBeDefined();
        });

        test('asking twice for the same flower classifies it once', async () => {
            await addFlowers(genomeIn(1, 0));

            SpeciesStore.classifyLater(1);
            SpeciesStore.classifyLater(1);
            await SpeciesStore.whenIdle();

            expect(client.classifyBatch).toHaveBeenCalledTimes(1);
            expect(client.classifyBatch.mock.calls[0][0]).toHaveLength(1);
        });

        test('works through a lot of flowers in batches of 25', async () => {
            await addFlowers(...Array.from({ length: 60 }, (_, i) => genomeIn(i % 2, 0)));

            await SpeciesStore.enqueue(Array.from({ length: 60 }, (_, i) => i + 1));

            expect(client.classifyBatch.mock.calls.map(([genomes]) => genomes.length)).toEqual([25, 25, 10]);
            expect(await db.species.count()).toBe(60);
        });

        test('is busy while it works and says how far it is, then goes back to idle', async () => {
            await addFlowers(genomeIn(1, 0), genomeIn(0, 1));
            const hold = gate();
            client.classifyBatch.mockImplementation(async (genomes) => {
                await hold.promise;
                return { matches: genomes.map(matchOf), fp: 'fp1' };
            });

            const done = SpeciesStore.enqueue([1, 2]);
            await vi.waitFor(() => expect(client.classifyBatch).toHaveBeenCalled());
            expect(SpeciesStore.status).toBe('classifying');
            expect(SpeciesStore.progress).toEqual({ done: 0, total: 2 });

            hold.open();
            await done;
            expect(SpeciesStore.status).toBe('idle');
            expect(SpeciesStore.progress).toEqual({ done: 0, total: 0 });
        });

        test('a flower added while it works is taken in the same run', async () => {
            await addFlowers(genomeIn(1, 0), genomeIn(0, 1));
            const hold = gate();
            client.classifyBatch.mockImplementationOnce(async (genomes) => {
                await hold.promise;
                return { matches: genomes.map(matchOf), fp: 'fp1' };
            });

            SpeciesStore.classifyLater(1);
            await vi.waitFor(() => expect(client.classifyBatch).toHaveBeenCalled());
            SpeciesStore.classifyLater(2);
            hold.open();
            await SpeciesStore.whenIdle();

            expect(await db.species.count()).toBe(2);
        });
    });

    describe('what happens to a flower while it is being classified', () => {
        const classifyWhile = async (change) => {
            await addFlowers(genomeIn(1, 0));
            const hold = gate();
            client.classifyBatch.mockImplementation(async (genomes) => {
                await hold.promise;
                return { matches: genomes.map(matchOf), fp: 'fp1' };
            });
            const done = SpeciesStore.classifyLater(1);
            await vi.waitFor(() => expect(client.classifyBatch).toHaveBeenCalled());
            await change();
            hold.open();
            await done;
        };

        test('deleted: no row is left for it', async () => {
            await classifyWhile(() => db.flowers.delete(1));
            expect(await db.species.count()).toBe(0);
            expect(SpeciesStore.rowFor(1)).toBeUndefined();
        });

        test('replaced by another flower with the same id (the ids start again after a wipe): the old answer is dropped', async () => {
            await classifyWhile(() => db.flowers.put({ id: 1, genome: genomeIn(0, 1), image: 'i' }));
            expect(await db.species.count()).toBe(0);
            expect(SpeciesStore.rowFor(1)).toBeUndefined();
        });

        test('with a copy of the same genome under that id: the answer is still true and is kept', async () => {
            await classifyWhile(() => db.flowers.put({ id: 1, genome: genomeIn(1, 0), image: 'other image' }));
            expect(await speciesRepository.getSpecies(1)).toMatchObject({ x: 1, y: 0 });
        });
    });

    describe('when the classifier fails', () => {
        test('the batch is skipped and said in the console, the rest goes on, and the flowers can be asked for again', async () => {
            await addFlowers(...Array.from({ length: 30 }, (_, i) => genomeIn(i % 2, 0)));
            client.classifyBatch.mockRejectedValueOnce(new Error('wasm trapped'));

            await SpeciesStore.enqueue(Array.from({ length: 30 }, (_, i) => i + 1));

            expect(warn).toHaveBeenCalledWith("couldn't classify some flowers", expect.any(Error));
            expect(await db.species.count()).toBe(5);
            expect(SpeciesStore.status).toBe('idle');
            expect(ErrorStore.push).not.toHaveBeenCalled();

            await SpeciesStore.classifyLater(1);
            expect(await speciesRepository.getSpecies(1)).toBeDefined();
        });

        test('a database that is closed for a moment, as when every flower is deleted, is not worth a warning', async () => {
            await addFlowers(genomeIn(1, 0));
            const closed = Object.assign(new Error('Database has been closed'), { name: 'DatabaseClosedError' });
            client.classifyBatch.mockRejectedValueOnce(closed);

            await SpeciesStore.classifyLater(1);

            expect(warn).not.toHaveBeenCalled();
            expect(await db.species.count()).toBe(0);
            expect(SpeciesStore.status).toBe('idle');
        });

        test('when it cannot start, nothing fails out loud and the flowers are not stuck for the next try', async () => {
            await addFlowers(genomeIn(1, 0));
            client.getModel.mockRejectedValueOnce(new Error('worker failed'));

            await expect(SpeciesStore.classifyLater(1)).resolves.toBeUndefined();
            expect(warn).toHaveBeenCalledWith("couldn't start the species classifier", expect.any(Error));
            expect(await db.species.count()).toBe(0);

            await SpeciesStore.classifyLater(1);
            expect(await speciesRepository.getSpecies(1)).toBeDefined();
        });
    });

    describe('ensureFor', () => {
        test('classifies the flowers of a page that have no species for this classifier and only reads the others', async () => {
            await addFlowers(genomeIn(1, 0), genomeIn(0, 1), genomeIn(1, 1));
            await speciesRepository.bulkPutSpecies([
                { id: 1, x: 1, y: 0, d: 0.1, fp: 'fp1' },
                { id: 2, x: 0, y: 0, d: 0.1, fp: 'older-classifier' },
            ]);

            await SpeciesStore.ensureFor([1, 2, 3]);

            expect(client.classifyBatch).toHaveBeenCalledTimes(1);
            expect(client.classifyBatch.mock.calls[0][0]).toEqual([genomeIn(0, 1), genomeIn(1, 1)]);
            expect(SpeciesStore.rowFor(1)).toEqual({ id: 1, x: 1, y: 0, d: 0.1, fp: 'fp1' });
            expect(SpeciesStore.rowFor(2)).toMatchObject({ x: 0, y: 1, fp: 'fp1' });
            expect(SpeciesStore.rowFor(3)).toMatchObject({ x: 1, y: 1, fp: 'fp1' });
        });

        test('never fails, the page just has no badges', async () => {
            client.getModel.mockRejectedValue(new Error('worker failed'));
            await expect(SpeciesStore.ensureFor([1])).resolves.toBeUndefined();
            expect(warn).toHaveBeenCalledWith("couldn't read the species of some flowers", expect.any(Error));
        });
    });

    describe('classifyStale', () => {
        test('classifies every flower without a species, newest first, and leaves the others', async () => {
            await addFlowers(genomeIn(0, 0), genomeIn(0, 1), genomeIn(1, 0), genomeIn(1, 1), '{"cell":[0,0],"d":9}');
            await speciesRepository.bulkPutSpecies([{ id: 3, x: 1, y: 0, d: 0.1, fp: 'fp1' }]);

            await SpeciesStore.classifyStale();

            expect(client.classifyBatch).toHaveBeenCalledTimes(1);
            expect(client.classifyBatch.mock.calls[0][0]).toEqual(['{"cell":[0,0],"d":9}', genomeIn(1, 1), genomeIn(0, 1), genomeIn(0, 0)]);
            expect(await db.species.count()).toBe(5);
        });

        test('also does the ones of an older classifier', async () => {
            await addFlowers(genomeIn(0, 0));
            await speciesRepository.bulkPutSpecies([{ id: 1, x: 1, y: 1, d: 5, fp: 'older-classifier' }]);

            await SpeciesStore.classifyStale();

            expect(await speciesRepository.getSpecies(1)).toEqual({ id: 1, x: 0, y: 0, d: 1, fp: 'fp1' });
        });
    });

    describe('whenIdle', () => {
        test('is done at once when nothing is going on', async () => {
            await expect(SpeciesStore.whenIdle()).resolves.toBeUndefined();
        });

        test('also waits for classifyStale while it is still finding out which flowers need it', async () => {
            await addFlowers(genomeIn(1, 0));
            SpeciesStore.classifyStale();

            // nothing is queued yet: it has not read the tables
            expect(client.classifyBatch).not.toHaveBeenCalled();
            await SpeciesStore.whenIdle();

            expect(await speciesRepository.getSpecies(1)).toMatchObject({ x: 1, y: 0 });
        });

        test('also waits for ensureFor', async () => {
            await addFlowers(genomeIn(0, 1));
            SpeciesStore.ensureFor([1]);

            await SpeciesStore.whenIdle();

            expect(await speciesRepository.getSpecies(1)).toMatchObject({ x: 0, y: 1 });
        });
    });

    describe('summary', () => {
        const rowsWith = (distances, extra = {}) => distances.map((d, i) => ({ id: i + 1, x: i % 2, y: 0, d, fp: 'fp1', ...extra }));

        beforeEach(async () => {
            await SpeciesStore.start();
        });

        test('counts the flowers of each species of this classifier, not the unclassified or the stale ones', async () => {
            await speciesRepository.bulkPutSpecies([
                { id: 1, x: 1, y: 0, d: 1, fp: 'fp1' },
                { id: 2, x: 1, y: 0, d: 1, fp: 'fp1' },
                { id: 3, x: 0, y: 1, d: 1, fp: 'fp1' },
                { id: 4, x: null, y: null, d: null, fp: 'fp1' },
                { id: 5, x: 0, y: 0, d: 1, fp: 'older-classifier' },
            ]);

            await SpeciesStore.refreshSummary();

            expect(SpeciesStore.summary.counts).toEqual(new Map([['1,0', 2], ['0,1', 1]]));
            expect(SpeciesStore.summary.classified).toBe(3);
        });

        test('says nothing is atypical until there are 20 flowers to know what is usual', async () => {
            await speciesRepository.bulkPutSpecies(rowsWith(Array.from({ length: 19 }, () => 1)));
            await SpeciesStore.refreshSummary();
            expect(SpeciesStore.summary.atypicalAbove).toBeNull();
            expect(SpeciesStore.summary.atypical).toBe(0);
            expect(SpeciesStore.isAtypical({ d: 1000 })).toBe(false);
        });

        test('a flower is atypical when it is farther than the mean plus 2 standard deviations', async () => {
            // 19 flowers at 1 and one at 6: mean 1.25, standard deviation (of the 20) sqrt(1.1875)
            await speciesRepository.bulkPutSpecies(rowsWith([...Array.from({ length: 19 }, () => 1), 6]));

            await SpeciesStore.refreshSummary();

            const limit = 1.25 + 2 * Math.sqrt(1.1875);
            expect(SpeciesStore.summary.atypicalAbove).toBeCloseTo(limit, 10);
            // only the flower at 6 is farther than that
            expect(SpeciesStore.summary.atypical).toBe(1);
            expect(SpeciesStore.isAtypical({ d: limit + 0.01 })).toBe(true);
            expect(SpeciesStore.isAtypical({ d: limit - 0.01 })).toBe(false);
        });

        test('is read when the classification of a lot of flowers is done', async () => {
            await addFlowers(genomeIn(1, 0), genomeIn(1, 0), genomeIn(0, 1));

            await SpeciesStore.enqueue([1, 2, 3]);

            expect(SpeciesStore.summary.counts).toEqual(new Map([['1,0', 2], ['0,1', 1]]));
        });
    });

    describe('naming and selecting', () => {
        test('nameOf is empty until the classifier is in use, then the name of the species', async () => {
            expect(SpeciesStore.nameOf(1, 0)).toBe('');

            await SpeciesStore.start();

            expect(SpeciesStore.nameOf(0, 0)).toBe('Slender Aster');
            expect(SpeciesStore.nameOf(1, 0)).toBe('Ruffled Aster');
        });

        test('select keeps a copy of the species, so the caller cannot change it, and null clears it', () => {
            const cell = { x: 1, y: 0, extra: 'not kept' };

            SpeciesStore.select(cell);
            cell.x = 5;

            expect(SpeciesStore.selected).toEqual({ x: 1, y: 0 });
            SpeciesStore.select(null);
            expect(SpeciesStore.selected).toBeNull();
        });
    });

    describe('randomFlowerIn', () => {
        // three flowers in (1, 0), one in (0, 1); ids are 1..4 and the newest is listed first
        beforeEach(async () => {
            await addFlowers(genomeIn(1, 0), genomeIn(1, 0), genomeIn(0, 1), genomeIn(1, 0));
            await SpeciesStore.start();
            await SpeciesStore.enqueue([1, 2, 3, 4]);
        });

        test('is null before the classifier is in use', async () => {
            _resetSpeciesStoreForTests();
            createTestingPinia({ stubActions: false, createSpy: vi.fn });

            expect(await useSpeciesStore().randomFlowerIn({ x: 1, y: 0 })).toBeNull();
        });

        test('is null for a species with no flowers, without asking for a flower', async () => {
            const list = vi.spyOn(speciesRepository, 'listFlowerIdsByCell');

            expect(await SpeciesStore.randomFlowerIn({ x: 5, y: 5 })).toBeNull();
            expect(list).not.toHaveBeenCalled();
            list.mockRestore();
        });

        test('the luck picks the position in the list of the species: every flower of it can be the one, and no other', async () => {
            const picked = [];
            for(const luck of [0, 0.34, 0.67, 0.999]){
                picked.push(await SpeciesStore.randomFlowerIn({ x: 1, y: 0 }, () => luck));
            }

            // newest first: 4, 2, 1 are the flowers of (1, 0), 3 is of another species
            expect(picked).toEqual([4, 2, 1, 1]);
        });

        test('stays in the list of the species when the luck is out of range', async () => {
            expect(await SpeciesStore.randomFlowerIn({ x: 1, y: 0 }, () => 1)).toBe(1);
            expect(await SpeciesStore.randomFlowerIn({ x: 0, y: 1 }, () => 0.5)).toBe(3);
        });

        test('only counts the flowers of the classifier in use', async () => {
            await db.species.update(3, { fp: 'another' });

            expect(await SpeciesStore.randomFlowerIn({ x: 0, y: 1 })).toBeNull();
        });

        test('without a luck of its own it still gives a flower of the species', async () => {
            const id = await SpeciesStore.randomFlowerIn({ x: 1, y: 0 });

            expect([1, 2, 4]).toContain(id);
        });
    });

    describe('sub-species', () => {
        const record = (key = '1,0', overrides = {}) => {
            const [x, y] = key.split(',').map(Number);
            return { id: `sub:fp1:${key}`, fp: 'fp1', x, y, json: 'MAP', subfp: 'sub:MAP', w: 2, h: 1, flowers: 3, at: 1, ...overrides };
        };
        const hashOf = (genome) => SpeciesClient.fingerprint(genome);
        // flowers made after the four of the beforeEach
        const addMore = (...more) => flowerRepository.bulkAddFlowers(more.map((genome, i) => ({ id: 5 + i, genome, image: 'i' })));
        let genomes;
        let split;

        beforeEach(async () => {
            genomes = [genomeIn(1, 0), genomeIn(1, 0), genomeIn(1, 0), genomeIn(0, 1)];
            await addFlowers(...genomes);
            await SpeciesStore.start();
            await SpeciesStore.enqueue([1, 2, 3, 4]);
            split = vi.fn();
            SpeciesTrainer.mockImplementation(function(){
                this.split = split;
            });
        });

        // the species (1, 0) is split: its map is saved and the flowers 1 and 2 are in sub-species (0, 0) and 3 in (1, 0)
        const splitAlready = async () => {
            await speciesRepository.putClassifier(record());
            await SpeciesStore.loadSubmaps();
            await db.species.update(1, { sx: 0, sy: 0, sfp: 'sub:MAP' });
            await db.species.update(2, { sx: 0, sy: 0, sfp: 'sub:MAP' });
            await db.species.update(3, { sx: 1, sy: 0, sfp: 'sub:MAP' });
        };

        test('start reads which species are split for the classifier in use, and no other', async () => {
            await speciesRepository.putClassifier(record());
            await speciesRepository.putClassifier(record('1,0', { id: 'sub:other:1,0', fp: 'other' }));
            _resetSpeciesStoreForTests();
            createTestingPinia({ stubActions: false, createSpy: vi.fn });
            const fresh = useSpeciesStore();

            await fresh.start();

            expect(fresh.submapOf(1, 0)).toEqual({ subfp: 'sub:MAP', w: 2, h: 1, flowers: 3 });
            expect(fresh.submapOf(0, 1)).toBeUndefined();
            expect(fresh.submaps.size).toBe(1);
        });

        describe('split', () => {
            const rowsOf = (ids, sx = 0) => ids.map((id) => ({ id, hash: hashOf(genomes[id - 1]), sfp: 'sub:MAP', match: { x: sx, y: 0, distance: 0.3 } }));
            const params = { cell: { x: 1, y: 0 }, width: 2, height: 1, epochs: 2 };
            const done = (rows) => ({
                outcome: 'done', epochs: 2, flowers: rows.length, width: 2, height: 1, before: {}, after: {},
                model: { json: 'MAP', fp: 'sub:MAP' }, rows,
            });

            test('asks the trainer for the flowers of the species of the classifier in use, and keeps the map and where they are in it', async () => {
                SpeciesStore.select({ x: 1, y: 0 });
                SpeciesStore.selectSub({ x: 1, y: 0 });
                split.mockResolvedValue(done([...rowsOf([1, 2]), ...rowsOf([3], 1)]));

                const outcome = await SpeciesStore.split(params);

                expect(outcome).toBe('done');
                expect(split.mock.calls[0][0]).toMatchObject({ width: 2, height: 1, epochs: 2 });
                expect([...split.mock.calls[0][0].ids].sort()).toEqual([1, 2, 3]);
                expect(await speciesRepository.getClassifier('sub:fp1:1,0')).toMatchObject({
                    fp: 'fp1', x: 1, y: 0, json: 'MAP', subfp: 'sub:MAP', w: 2, h: 1, flowers: 3,
                });
                expect(await speciesRepository.getSpecies(1)).toMatchObject({ x: 1, y: 0, sx: 0, sy: 0, sfp: 'sub:MAP' });
                expect(await speciesRepository.getSpecies(3)).toMatchObject({ sx: 1, sy: 0, sfp: 'sub:MAP' });
                expect((await speciesRepository.getSpecies(4)).sfp).toBeUndefined();
                expect(SpeciesStore.rowFor(1)).toMatchObject({ sx: 0, sfp: 'sub:MAP' });
                expect(SpeciesStore.submapOf(1, 0)).toMatchObject({ subfp: 'sub:MAP', w: 2, h: 1 });
                expect(SpeciesStore.selectedSub).toBeNull();
                expect(SpeciesStore.training.kind).toBeNull();
                expect(SpeciesStore.training.result).toEqual({ outcome: 'done', message: 'Done: Ruffled Aster is now 2 sub-species.' });
            });

            test('a flower that is not the one it was placed from, or not in that species anymore, is left alone', async () => {
                split.mockImplementation(async () => {
                    // while it ran: flower 2 got another genome, flower 3 was classified into another species
                    await db.flowers.update(2, { genome: genomeIn(1, 0, 9) });
                    await db.species.update(3, { x: 0, y: 1 });
                    return done(rowsOf([1, 2, 3]));
                });

                await SpeciesStore.split(params);

                expect((await speciesRepository.getSpecies(1)).sfp).toBe('sub:MAP');
                expect((await speciesRepository.getSpecies(2)).sfp).toBeUndefined();
                expect((await speciesRepository.getSpecies(3)).sfp).toBeUndefined();
            });

            test('a flower that cannot be placed is kept as not placed, so it is not asked again', async () => {
                split.mockResolvedValue(done([{ ...rowsOf([1])[0], match: null }, ...rowsOf([2, 3])]));

                await SpeciesStore.split(params);

                expect(await speciesRepository.getSpecies(1)).toMatchObject({ sx: null, sy: null, sfp: 'sub:MAP' });
            });

            test('too few flowers says how many it needs and keeps nothing', async () => {
                split.mockResolvedValue({ outcome: 'too-few', flowers: 3, needed: 6 });

                expect(await SpeciesStore.split(params)).toBe('too-few');

                expect(SpeciesStore.training.result.message).toBe('Ruffled Aster has 3 flowers, and these sub-species need at least 6. Use fewer cells or make more flowers.');
                expect(await speciesRepository.getClassifier('sub:fp1:1,0')).toBeUndefined();
                expect(SpeciesStore.submaps.size).toBe(0);
            });

            test('cancelling reaches the trainer as an abort, and keeps nothing', async () => {
                let aborted = null;
                split.mockImplementation(async ({ signal }) => {
                    SpeciesStore.cancelTraining();
                    aborted = signal.aborted;
                    return { outcome: 'cancelled' };
                });

                expect(await SpeciesStore.split(params)).toBe('cancelled');

                expect(aborted).toBe(true);
                expect(SpeciesStore.training.result.message).toBe('Cancelled, nothing was changed.');
                expect(SpeciesStore.submaps.size).toBe(0);
            });

            test('shows the progress of the trainer in training', async () => {
                split.mockImplementation(async ({ onProgress }) => {
                    onProgress({ phase: 'training', done: 1, total: 2, evaluation: { meanQuantizationError: 0.5 } });
                    expect(SpeciesStore.training).toMatchObject({ kind: 'split', phase: 'training', done: 1, total: 2, qe: [] });
                    return { outcome: 'cancelled' };
                });

                await SpeciesStore.split(params);
            });

            test('a failure goes to the ErrorStore and keeps nothing', async () => {
                const failure = new Error('wasm failed');
                split.mockRejectedValue(failure);

                expect(await SpeciesStore.split(params)).toBe('failed');

                expect(ErrorStore.push).toHaveBeenCalledWith(failure);
                expect(SpeciesStore.training).toMatchObject({ kind: null, result: { outcome: 'failed' } });
            });

            test('does not start while the flowers are being classified, or while something else is running', async () => {
                SpeciesStore.status = 'classifying';
                expect(await SpeciesStore.split(params)).toBe('busy');
                expect(SpeciesStore.training.result.outcome).toBe('busy');
                SpeciesStore.status = 'idle';
                SpeciesStore.training.kind = 'fineTune';
                expect(await SpeciesStore.split(params)).toBe('busy');

                expect(split).not.toHaveBeenCalled();
            });
        });

        describe('the flowers that are made later', () => {
            beforeEach(splitAlready);

            test('a flower that is classified into a split species is placed in its sub-species with the saved map', async () => {
                await addMore(genomeIn(1, 0, 1, [1, 0]), genomeIn(0, 1, 1, [1, 0]));

                await SpeciesStore.classifyLater(5);
                await SpeciesStore.classifyLater(6);

                expect(await speciesRepository.getSpecies(5)).toMatchObject({ x: 1, y: 0, sx: 1, sy: 0, sfp: 'sub:MAP' });
                // (0, 1) is not split
                expect((await speciesRepository.getSpecies(6)).sfp).toBeUndefined();
                expect(client.classifyBatchWith).toHaveBeenCalledTimes(1);
                expect(client.classifyBatchWith.mock.calls[0][0]).toBe('MAP');
                expect(SpeciesStore.rowFor(5)).toMatchObject({ sx: 1 });
            });

            test('a failure of the sub-species map leaves the flower in its species and says it in the console', async () => {
                client.classifyBatchWith.mockRejectedValue(new Error('map failed'));
                await addMore(genomeIn(1, 0, 1, [1, 0]));

                await SpeciesStore.classifyLater(5);

                expect(await speciesRepository.getSpecies(5)).toMatchObject({ x: 1, y: 0, fp: 'fp1' });
                expect((await speciesRepository.getSpecies(5)).sfp).toBeUndefined();
                expect(warn).toHaveBeenCalledWith("couldn't place some flowers in their sub-species", expect.any(Error));
            });

            test('ensureSub places the flowers of the species that no map placed, once', async () => {
                await db.species.update(2, { sfp: 'older' });
                await db.flowers.update(2, { genome: genomeIn(1, 0, 1, [1, 0]) });

                await SpeciesStore.ensureSub({ x: 1, y: 0 });

                expect(await speciesRepository.getSpecies(2)).toMatchObject({ sx: 1, sy: 0, sfp: 'sub:MAP' });
                expect(client.classifyBatchWith).toHaveBeenCalledTimes(1);
                expect(client.classifyBatchWith.mock.calls[0][1]).toHaveLength(1);

                await SpeciesStore.ensureSub({ x: 1, y: 0 });
                expect(client.classifyBatchWith).toHaveBeenCalledTimes(1);
            });

            test('ensureSub does nothing for a species that is not split', async () => {
                await SpeciesStore.ensureSub({ x: 0, y: 1 });

                expect(client.classifyBatchWith).not.toHaveBeenCalled();
            });

            test('a flower that was classified again meanwhile is left to the classification that did it', async () => {
                const open = gate();
                client.classifyBatchWith.mockImplementation(async () => {
                    await open.promise;
                    return { matches: [{ x: 1, y: 0, distance: 0.1 }], fp: 'sub:MAP' };
                });
                await db.species.update(2, { sfp: 'older' });

                const placing = SpeciesStore.ensureSub({ x: 1, y: 0 });
                await vi.waitFor(() => expect(client.classifyBatchWith).toHaveBeenCalled());
                await db.species.update(2, { x: 0, y: 1 });
                open.open();
                await placing;

                expect(await speciesRepository.getSpecies(2)).toMatchObject({ x: 0, y: 1, sfp: 'older' });
            });

            test('while it places them, fine-tune, reset, split and unsplit say busy, and whenIdle waits for it', async () => {
                const open = gate();
                client.classifyBatchWith.mockImplementation(async () => {
                    await open.promise;
                    return { matches: [null], fp: 'sub:MAP' };
                });
                await db.species.update(2, { sfp: 'older' });

                const placing = SpeciesStore.ensureSub({ x: 1, y: 0 });
                await vi.waitFor(() => expect(client.classifyBatchWith).toHaveBeenCalled());
                const idle = vi.fn();
                SpeciesStore.whenIdle().then(idle);

                expect(await SpeciesStore.fineTune({ epochs: 1, baseLR: 0.3, baseRadius: 1 })).toBe('busy');
                expect(await SpeciesStore.resetClassifier()).toBe('busy');
                expect(await SpeciesStore.split({ cell: { x: 1, y: 0 }, width: 2, height: 1, epochs: 1 })).toBe('busy');
                expect(await SpeciesStore.unsplit({ x: 1, y: 0 })).toBe('busy');
                await Promise.resolve();
                expect(idle).not.toHaveBeenCalled();

                open.open();
                await placing;
                await SpeciesStore.whenIdle();
                expect(idle).toHaveBeenCalled();
                expect(await SpeciesStore.unsplit({ x: 1, y: 0 })).toBe('done');
            });
        });

        describe('unsplit', () => {
            beforeEach(splitAlready);

            test('deletes the map and the sub-species of that species only, the flowers stay in it', async () => {
                await speciesRepository.putClassifier(record('0,1'));
                await SpeciesStore.loadSubmaps();
                await db.species.update(4, { sx: 0, sy: 0, sfp: 'sub:MAP' });
                SpeciesStore.select({ x: 1, y: 0 });
                SpeciesStore.selectSub({ x: 1, y: 0 });
                await SpeciesStore.ensureFor([1]);

                expect(await SpeciesStore.unsplit({ x: 1, y: 0 })).toBe('done');

                expect(await speciesRepository.getClassifier('sub:fp1:1,0')).toBeUndefined();
                expect(await speciesRepository.getClassifier('sub:fp1:0,1')).toBeDefined();
                expect(await speciesRepository.getSpecies(1)).toEqual({ id: 1, x: 1, y: 0, d: 1, fp: 'fp1' });
                expect(SpeciesStore.rowFor(1)).toEqual({ id: 1, x: 1, y: 0, d: 1, fp: 'fp1' });
                expect((await speciesRepository.getSpecies(4)).sfp).toBe('sub:MAP');
                expect(SpeciesStore.submapOf(1, 0)).toBeUndefined();
                expect(SpeciesStore.submapOf(0, 1)).toBeDefined();
                expect(SpeciesStore.selectedSub).toBeNull();
            });

            test('says busy while flowers are being classified', async () => {
                SpeciesStore.status = 'classifying';

                expect(await SpeciesStore.unsplit({ x: 1, y: 0 })).toBe('busy');
                expect(SpeciesStore.submapOf(1, 0)).toBeDefined();
            });
        });

        describe('when the classifier is replaced', () => {
            beforeEach(splitAlready);

            test('a fine-tune that is kept removes the sub-species, a cancelled one does not', async () => {
                const fineTune = vi.fn();
                SpeciesTrainer.mockImplementation(function(){
                    this.fineTune = fineTune;
                });
                fineTune.mockResolvedValue({ outcome: 'cancelled' });
                await SpeciesStore.fineTune({ epochs: 1, baseLR: 0.3, baseRadius: 1 });
                expect(SpeciesStore.submapOf(1, 0)).toBeDefined();

                fineTune.mockResolvedValue({
                    outcome: 'done', epochs: 1, flowers: 0, before: { meanQuantizationError: 1, usedNodes: 1, totalNodes: 4, busiestNodeCount: 1 },
                    after: { meanQuantizationError: 1, usedNodes: 1, totalNodes: 4, busiestNodeCount: 1 },
                    model: { json: classifierJson({ toroidal: false }), fp: 'tunedfp' }, rows: [],
                });
                await SpeciesStore.fineTune({ epochs: 1, baseLR: 0.3, baseRadius: 1 });

                expect(await speciesRepository.getClassifier('sub:fp1:1,0')).toBeUndefined();
                expect(await speciesRepository.getClassifier('tuned')).toBeDefined();
                expect(SpeciesStore.submaps.size).toBe(0);
                expect(SpeciesStore.selectedSub).toBeNull();
            });

            test('going back to the built-in classifier removes them, and the rows forget their sub-species', async () => {
                SpeciesStore.selectSub({ x: 1, y: 0 });

                expect(await SpeciesStore.resetClassifier()).toBe('done');

                expect(await db.classifier.count()).toBe(0);
                expect((await db.species.toArray()).filter((row) => 'sfp' in row)).toEqual([]);
                expect(SpeciesStore.submaps.size).toBe(0);
                expect(SpeciesStore.selectedSub).toBeNull();
            });
        });

        describe('what is shown', () => {
            beforeEach(splitAlready);

            test('readSubspecies has the map of the species and how many flowers are in each sub-species', async () => {
                await speciesRepository.putClassifier(record('1,0', { json: classifierJson({ width: '2', height: '1', toroidal: false, weights: new Array(10).fill(0) }) }));

                const sub = await SpeciesStore.readSubspecies({ x: 1, y: 0 });

                expect(sub.subfp).toBe('sub:MAP');
                expect([sub.model.width, sub.model.height, sub.model.toroidal]).toEqual([2, 1, false]);
                // flowers 1 and 2 are in (0, 0), 3 in (1, 0)
                expect(sub.counts).toEqual(new Map([['0,0', 2], ['1,0', 1]]));
            });

            test('readSubspecies is null for a species that is not split, or whose map is gone', async () => {
                expect(await SpeciesStore.readSubspecies({ x: 0, y: 1 })).toBeNull();

                await speciesRepository.deleteClassifier('sub:fp1:1,0');
                expect(await SpeciesStore.readSubspecies({ x: 1, y: 0 })).toBeNull();
            });

            test('subLabelFor gives the letter of the sub-species of a row, counted by rows', () => {
                SpeciesStore.submaps = new Map([['1,0', { subfp: 'sub:MAP', w: 3, h: 2, flowers: 8 }]]);
                const row = { id: 1, x: 1, y: 0, d: 1, fp: 'fp1', sx: 1, sy: 1, sfp: 'sub:MAP' };

                expect(SpeciesStore.subLabelFor(row)).toBe('e');
                expect(SpeciesStore.subLabelFor({ ...row, sx: 0, sy: 0 })).toBe('a');
            });

            test.each([
                ['another species', { x: 0, y: 1 }],
                ['a map that is not the one saved', { sfp: 'older' }],
                ['no sub-species', { sx: null, sy: null }],
                ['not placed yet', { sx: undefined, sy: undefined, sfp: undefined }],
            ])('subLabelFor is empty for a row of %s', (_, overrides) => {
                const row = { id: 1, x: 1, y: 0, d: 1, fp: 'fp1', sx: 1, sy: 0, sfp: 'sub:MAP', ...overrides };

                expect(SpeciesStore.subLabelFor(row)).toBe('');
            });

            test('training says which dialog it is for: a split, a fine-tune, and a busy answer to each', async () => {
                const fineTune = vi.fn().mockResolvedValue({ outcome: 'cancelled' });
                SpeciesTrainer.mockImplementation(function(){
                    this.split = split;
                    this.fineTune = fineTune;
                });
                split.mockResolvedValue({ outcome: 'cancelled' });

                await SpeciesStore.split({ cell: { x: 1, y: 0 }, width: 2, height: 1, epochs: 1 });
                expect(SpeciesStore.training.ran).toBe('split');
                await SpeciesStore.fineTune({ epochs: 1, baseLR: 0.3, baseRadius: 1 });
                expect(SpeciesStore.training.ran).toBe('fineTune');

                SpeciesStore.status = 'classifying';
                await SpeciesStore.split({ cell: { x: 1, y: 0 }, width: 2, height: 1, epochs: 1 });
                expect(SpeciesStore.training).toMatchObject({ ran: 'split', result: { outcome: 'busy' } });
                await SpeciesStore.fineTune({ epochs: 1, baseLR: 0.3, baseRadius: 1 });
                expect(SpeciesStore.training).toMatchObject({ ran: 'fineTune', result: { outcome: 'busy' } });
            });
        });

        describe('choosing', () => {
            test('the sub-species is forgotten when another species is selected, and kept for the same one', () => {
                SpeciesStore.select({ x: 1, y: 0 });
                SpeciesStore.selectSub({ x: 0, y: 0 });

                SpeciesStore.select({ x: 1, y: 0 });
                expect(SpeciesStore.selectedSub).toEqual({ x: 0, y: 0 });

                SpeciesStore.select({ x: 0, y: 1 });
                expect(SpeciesStore.selectedSub).toBeNull();
            });

            test('selectSub keeps a copy and null clears it', () => {
                const sub = { x: 1, y: 0, extra: 1 };

                SpeciesStore.selectSub(sub);
                sub.x = 5;
                expect(SpeciesStore.selectedSub).toEqual({ x: 1, y: 0 });

                SpeciesStore.selectSub(null);
                expect(SpeciesStore.selectedSub).toBeNull();
            });

            test('a random flower can be picked from one sub-species of the species only', async () => {
                await splitAlready();

                expect(await SpeciesStore.randomFlowerIn({ x: 1, y: 0 }, () => 0, { x: 1, y: 0 })).toBe(3);
                const fromFirst = [];
                for(const luck of [0, 0.9]){
                    fromFirst.push(await SpeciesStore.randomFlowerIn({ x: 1, y: 0 }, () => luck, { x: 0, y: 0 }));
                }
                expect(fromFirst.sort()).toEqual([1, 2]);
                expect(await SpeciesStore.randomFlowerIn({ x: 1, y: 0 }, () => 0, { x: 1, y: 1 })).toBeNull();
            });

            test('asking for a sub-species of a species that is not split gives a flower of the species', async () => {
                expect([1, 2, 3]).toContain(await SpeciesStore.randomFlowerIn({ x: 1, y: 0 }, () => 0, { x: 0, y: 0 }));
            });
        });
    });

    describe('flowers that go away', () => {
        beforeEach(async () => {
            await addFlowers(genomeIn(1, 0), genomeIn(0, 1));
            await SpeciesStore.enqueue([1, 2]);
        });

        test('removeFlower forgets the row of a deleted flower, in the table and in the page', async () => {
            await SpeciesStore.removeFlower(1);

            expect(await speciesRepository.getSpecies(1)).toBeUndefined();
            expect(SpeciesStore.rowFor(1)).toBeUndefined();
            expect(SpeciesStore.rowFor(2)).toBeDefined();
        });

        test('invalidate forgets what was known by id: the ids start again after a wipe', () => {
            expect(SpeciesStore.rowFor(1)).toBeDefined();

            SpeciesStore.invalidate();

            expect(SpeciesStore.rowFor(1)).toBeUndefined();
            expect(SpeciesStore.rowFor(2)).toBeUndefined();
            expect(SpeciesStore.summary).toEqual({ counts: new Map(), classified: 0, atypicalAbove: null, atypical: 0 });
        });
    });

    describe('fine-tuning', () => {
        const evaluation = (error, used = 2) => ({
            meanQuantizationError: error, usedNodes: used, totalNodes: 4, busiestNodeCount: 3, samplesUsed: 3, nodeCounts: [3, 0, 0, 0],
        });
        const tunedJson = classifierJson({ toroidal: false });
        const rowFor = (id, genome, match) => ({ id, hash: SpeciesClient.fingerprint(genome), fp: 'tunedfp', match });
        const done = (rows) => ({
            outcome: 'done', epochs: 2, flowers: rows.length, before: evaluation(1, 2), after: evaluation(0.5, 3),
            model: { json: tunedJson, fp: 'tunedfp' }, rows,
        });
        const params = { epochs: 2, baseLR: 0.3, baseRadius: 1 };
        let fineTune;

        beforeEach(() => {
            fineTune = vi.fn();
            SpeciesTrainer.mockImplementation(function(){
                this.fineTune = fineTune;
            });
        });

        describe('when it ends well', () => {
            let genomes;
            let result;

            beforeEach(async () => {
                genomes = [genomeIn(0, 0), '{}', genomeIn(1, 1)];
                await addFlowers(...genomes);
                await speciesRepository.putClassifier({ id: 'sub:oldfp:0,0', json: '{}' });
                result = done([
                    rowFor(1, genomes[0], { x: 1, y: 0, distance: 0.4 }),
                    rowFor(2, genomes[1], null),
                    rowFor(3, genomes[2], { x: 0, y: 1, distance: 0.6 }),
                ]);
                fineTune.mockResolvedValue(result);
            });

            test('keeps the classifier, and where each flower is for it', async () => {
                expect(await SpeciesStore.fineTune(params)).toBe('done');

                expect((await speciesRepository.getClassifier('tuned')).json).toBe(tunedJson);
                expect((await db.species.toArray()).map(({ id, x, y, d, fp }) => ({ id, x, y, d, fp }))).toEqual([
                    { id: 1, x: 1, y: 0, d: 0.4, fp: 'tunedfp' },
                    { id: 2, x: null, y: null, d: null, fp: 'tunedfp' },
                    { id: 3, x: 0, y: 1, d: 0.6, fp: 'tunedfp' },
                ]);
            });

            test('puts the classifier in use: the model, the fingerprint, and the species of the flowers for it', async () => {
                await SpeciesStore.fineTune(params);

                expect(SpeciesStore.fp).toBe('tunedfp');
                expect(SpeciesStore.hasTuned).toBe(true);
                expect(SpeciesStore.model.toroidal).toBe(false);
                expect(SpeciesStore.summary.counts).toEqual(new Map([['1,0', 1], ['0,1', 1]]));
                expect(SpeciesStore.summary.classified).toBe(2);
            });

            test('forgets what the page knew, it was for the other classifier, and tells the view the species changed', async () => {
                await SpeciesStore.start();
                await SpeciesStore.ensureFor([1]);
                expect(SpeciesStore.rows.size).toBe(1);
                const before = SpeciesStore.generation;

                await SpeciesStore.fineTune(params);

                expect(SpeciesStore.rows.size).toBe(0);
                expect(SpeciesStore.generation).toBe(before + 1);
            });

            test('gives the trainer the parameters and a way to cancel, and the classifier of the worker', async () => {
                await SpeciesStore.fineTune(params);

                expect(SpeciesTrainer).toHaveBeenCalledWith(client);
                expect(fineTune).toHaveBeenCalledWith(expect.objectContaining({ ...params, signal: expect.any(AbortSignal), onProgress: expect.any(Function) }));
            });

            test('says how it went, and is not running anymore', async () => {
                await SpeciesStore.fineTune(params);

                expect(SpeciesStore.isTuning).toBe(false);
                expect(SpeciesStore.training.kind).toBeNull();
                expect(SpeciesStore.training.result).toEqual({
                    outcome: 'done',
                    message: 'Done. Mean distance to the species prototype 1.000 to 0.500; species in use 2 to 3 of 4; most crowded species 3 to 3 flowers.',
                });
            });

            test('classifies the flowers that were made while it ran, for the new classifier', async () => {
                fineTune.mockImplementation(async () => {
                    await flowerRepository.bulkAddFlowers([{ id: 4, genome: genomeIn(1, 0), image: 'i' }]);
                    return result;
                });
                client.classifyBatch.mockImplementation(async (list) => ({ matches: list.map(matchOf), fp: 'tunedfp' }));

                await SpeciesStore.fineTune(params);
                await SpeciesStore.whenIdle();

                expect(client.classifyBatch).toHaveBeenCalledTimes(1);
                expect(client.classifyBatch.mock.calls[0][0]).toEqual([genomeIn(1, 0)]);
                expect(await speciesRepository.getSpecies(4)).toMatchObject({ x: 1, y: 0, fp: 'tunedfp' });
            });

            test('does not keep the species of a flower that is not the one that was classified', async () => {
                // 1 was deleted, 2 became another flower, 3 is as it was
                fineTune.mockImplementation(async () => {
                    await db.flowers.delete(1);
                    await db.flowers.put({ id: 2, genome: genomeIn(0, 1), image: 'i' });
                    return result;
                });

                await SpeciesStore.fineTune(params);

                expect((await db.species.toArray()).map((row) => row.id)).toEqual([3]);
            });
        });

        describe('while it runs', () => {
            test('shows where it is, the distance after each epoch, and the classifier before and now', async () => {
                await addFlowers(genomeIn(0, 0));
                const seen = [];
                fineTune.mockImplementation(async ({ onProgress }) => {
                    onProgress({ phase: 'preparing', done: 0, total: 1 });
                    seen.push({ ...SpeciesStore.training, qe: [...SpeciesStore.training.qe] });
                    onProgress({ phase: 'training', done: 0, total: 2, evaluation: evaluation(1) });
                    onProgress({ phase: 'training', done: 1, total: 2, evaluation: evaluation(0.8, 3) });
                    onProgress({ phase: 'training', done: 2, total: 2, evaluation: evaluation(0.6, 4) });
                    seen.push({ ...SpeciesStore.training, qe: [...SpeciesStore.training.qe] });
                    return { outcome: 'cancelled' };
                });

                await SpeciesStore.fineTune(params);

                expect(seen[0]).toMatchObject({ kind: 'fineTune', phase: 'preparing', done: 0, total: 1, qe: [], before: null });
                expect(seen[1]).toMatchObject({ kind: 'fineTune', phase: 'training', done: 2, total: 2, qe: [1, 0.8, 0.6] });
                expect(seen[1].before.usedNodes).toBe(2);
                expect(seen[1].now.usedNodes).toBe(4);
            });

            test('is running until it ends, and does not start another', async () => {
                const hold = gate();
                fineTune.mockImplementation(async () => {
                    await hold.promise;
                    return { outcome: 'cancelled' };
                });

                const first = SpeciesStore.fineTune(params);
                await vi.waitFor(() => expect(fineTune).toHaveBeenCalled());
                expect(SpeciesStore.isTuning).toBe(true);
                expect(await SpeciesStore.fineTune(params)).toBe('busy');
                expect(fineTune).toHaveBeenCalledTimes(1);

                hold.open();
                await first;
                expect(SpeciesStore.isTuning).toBe(false);
            });

            test('cancelTraining tells the trainer, which ends it', async () => {
                fineTune.mockImplementation(async ({ signal }) => {
                    await vi.waitFor(() => expect(signal.aborted).toBe(true));
                    return { outcome: 'cancelled' };
                });

                const running = SpeciesStore.fineTune(params);
                await vi.waitFor(() => expect(fineTune).toHaveBeenCalled());
                SpeciesStore.cancelTraining();

                expect(await running).toBe('cancelled');
            });

            test('cancelTraining does nothing when there is nothing running', () => {
                expect(() => SpeciesStore.cancelTraining()).not.toThrow();
            });
        });

        describe('when it changes nothing', () => {
            test.each([
                ['cancelled', 'Cancelled, the classifier is unchanged.'],
                ['no-flowers', 'Make some flowers first, there is nothing to fine-tune on.'],
                ['unusable', 'None of your flowers can be classified.'],
            ])('%s: nothing is saved and it says why', async (outcome, message) => {
                await addFlowers(genomeIn(0, 0));
                fineTune.mockResolvedValue({ outcome });
                await SpeciesStore.start();
                const before = { fp: SpeciesStore.fp, generation: SpeciesStore.generation };

                expect(await SpeciesStore.fineTune(params)).toBe(outcome);

                expect(await speciesRepository.getClassifier('tuned')).toBeUndefined();
                expect(await db.species.count()).toBe(0);
                expect({ fp: SpeciesStore.fp, generation: SpeciesStore.generation }).toEqual(before);
                expect(SpeciesStore.hasTuned).toBe(false);
                expect(SpeciesStore.training.result).toEqual({ outcome, message });
                expect(ErrorStore.push).not.toHaveBeenCalled();
            });

            test('it does not start while the flowers are being classified, and says so', async () => {
                SpeciesStore.status = 'classifying';

                expect(await SpeciesStore.fineTune(params)).toBe('busy');

                expect(fineTune).not.toHaveBeenCalled();
                expect(SpeciesStore.training.result.message).toBe('Your flowers are still being classified, try again in a moment.');
                expect(SpeciesStore.isTuning).toBe(false);
            });
        });

        describe('when it fails', () => {
            test('it is reported, nothing is saved, and it is not running anymore', async () => {
                const failure = new Error('wasm trapped');
                fineTune.mockRejectedValue(failure);

                expect(await SpeciesStore.fineTune(params)).toBe('failed');

                expect(ErrorStore.push).toHaveBeenCalledWith(failure);
                expect(await speciesRepository.getClassifier('tuned')).toBeUndefined();
                expect(SpeciesStore.isTuning).toBe(false);
                expect(SpeciesStore.training.result).toEqual({ outcome: 'failed', message: 'Fine-tuning failed.' });
            });

            test('it is reported when the worker cannot start', async () => {
                client.getModel.mockRejectedValue(new Error('worker failed'));

                expect(await SpeciesStore.fineTune(params)).toBe('failed');

                expect(fineTune).not.toHaveBeenCalled();
                expect(ErrorStore.push).toHaveBeenCalled();
            });

            test('a classifier that was kept is still the one in use when the counts cannot be read', async () => {
                await addFlowers(genomeIn(0, 0));
                fineTune.mockResolvedValue(done([rowFor(1, genomeIn(0, 0), { x: 1, y: 0, distance: 0.4 })]));
                const read = vi.spyOn(speciesRepository, 'listCurrent').mockRejectedValue(new Error('disk failure'));

                expect(await SpeciesStore.fineTune(params)).toBe('done');
                expect(SpeciesStore.fp).toBe('tunedfp');
                expect(SpeciesStore.hasTuned).toBe(true);
                read.mockRestore();
            });
        });
    });

    describe('resetClassifier', () => {
        beforeEach(async () => {
            await speciesRepository.putClassifier({ id: 'tuned', json: classifierJson({ toroidal: false }) });
            await speciesRepository.putClassifier({ id: 'sub:fp1:0,0', json: '{}' });
        });

        test('goes back to the built-in classifier: the fine-tuned one and the sub-species are deleted', async () => {
            client.getModel.mockResolvedValue({ json: classifierJson({ toroidal: false }), fp: 'tunedfp', custom: true });
            await SpeciesStore.start();
            client.getModel.mockResolvedValue({ json: classifierJson(), fp: 'builtinfp', custom: false });
            const before = SpeciesStore.generation;

            expect(await SpeciesStore.resetClassifier()).toBe('done');

            expect(client.loadSOM).toHaveBeenLastCalledWith('');
            expect(await db.classifier.count()).toBe(0);
            expect(SpeciesStore.fp).toBe('builtinfp');
            expect(SpeciesStore.hasTuned).toBe(false);
            expect(SpeciesStore.model.toroidal).toBe(true);
            expect(SpeciesStore.generation).toBe(before + 1);
        });

        test('the flowers stay and are classified again for the built-in classifier', async () => {
            await addFlowers(genomeIn(1, 0));
            await speciesRepository.bulkPutSpecies([{ id: 1, x: 0, y: 0, d: 0.1, fp: 'tunedfp' }]);
            client.getModel.mockResolvedValue({ json: classifierJson(), fp: 'builtinfp', custom: false });
            client.classifyBatch.mockImplementation(async (list) => ({ matches: list.map(matchOf), fp: 'builtinfp' }));
            await SpeciesStore.start();

            await SpeciesStore.resetClassifier();
            await SpeciesStore.whenIdle();

            expect(await db.flowers.count()).toBe(1);
            expect(await speciesRepository.getSpecies(1)).toMatchObject({ x: 1, y: 0, fp: 'builtinfp' });
        });

        test('forgets what the page knew by id', async () => {
            await addFlowers(genomeIn(1, 0));
            await SpeciesStore.classifyLater(1);
            expect(SpeciesStore.rows.size).toBe(1);

            await SpeciesStore.resetClassifier();

            expect(SpeciesStore.rows.size).toBe(0);
        });

        test('works without starting the worker when it was not needed: only what is saved is deleted', async () => {
            await SpeciesStore.loadSaved();
            expect(SpeciesStore.hasTuned).toBe(true);

            expect(await SpeciesStore.resetClassifier()).toBe('done');

            expect(getSpeciesClient).not.toHaveBeenCalled();
            expect(await db.classifier.count()).toBe(0);
            expect(SpeciesStore.hasTuned).toBe(false);
        });

        test('does not start while fine-tuning or while the flowers are being classified', async () => {
            SpeciesStore.training.kind = 'fineTune';
            expect(await SpeciesStore.resetClassifier()).toBe('busy');
            SpeciesStore.training.kind = null;
            SpeciesStore.status = 'classifying';
            expect(await SpeciesStore.resetClassifier()).toBe('busy');

            expect(await db.classifier.count()).toBe(2);
        });

        test('what is saved stays when the worker cannot go back, and it is reported', async () => {
            await SpeciesStore.start();
            const failure = new Error('worker failed');
            client.loadSOM.mockRejectedValueOnce(failure);

            expect(await SpeciesStore.resetClassifier()).toBe('failed');

            expect(ErrorStore.push).toHaveBeenCalledWith(failure);
            expect(await db.classifier.count()).toBe(2);
        });
    });
});
