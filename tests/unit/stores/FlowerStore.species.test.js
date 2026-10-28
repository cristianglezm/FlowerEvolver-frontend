// tests/unit/setup/jsdom.js
import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterAll, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { db } from '../../../src/stores/FlowerStore/db';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useSpeciesStore, _resetSpeciesStoreForTests } from '../../../src/stores/SpeciesStore';
import { getSpeciesClient } from '../../../src/services/speciesWorker';
import { getFlowerEvolver } from '../../../src/services/flowerEvolver';
import * as flowerRepository from '../../../src/services/flowerRepository';
import * as speciesRepository from '../../../src/services/speciesRepository';

// FlowerStore and SpeciesStore, the repositories (Dexie on fake-indexeddb) and the wasm are the real
// ones here: this is the seam the unit tests of each store cannot see. The worker is the only thing
// that is not, the classifier runs on the same thread.
vi.mock('../../../src/services/speciesWorker', async () => {
    const { SpeciesClient } = await import('../../../src/services/SpeciesClient');
    const { getFlowerEvolver } = await import('../../../src/services/flowerEvolver');
    const client = new SpeciesClient(async (method, args) => (await getFlowerEvolver())[method](...args));
    return { getSpeciesClient: () => client };
});

// Drawing flowers and classifying them is real work, a loaded machine can take seconds for one test.
describe('FlowerStore and SpeciesStore together', { timeout: 30000 }, () => {
    let FlowerStore;
    let SpeciesStore;

    const makeFlowers = async (count) => {
        for(let i = 0; i < count; ++i){
            await FlowerStore.makeLocalFlower();
        }
        await SpeciesStore.whenIdle();
        return flowerRepository.listFlowerIds();
    };

    beforeEach(async () => {
        if(db.isOpen()){
            await db.delete();
        }
        await db.open();
        _resetSpeciesStoreForTests();
        vi.restoreAllMocks();
        // the wasm is shared by the tests of this file, as the worker is by the pages: a fine-tuned
        // classifier of a test is not for the next one
        (await getFlowerEvolver()).loadSOM('');
        createTestingPinia({ stubActions: false, createSpy: vi.fn });
        FlowerStore = useFlowerStore();
        SpeciesStore = useSpeciesStore();
    });

    afterAll(async () => {
        await db.close();
    });

    test('a new flower gets its species by itself', async () => {
        const [id] = await makeFlowers(1);

        const row = await speciesRepository.getSpecies(id);
        expect(row.fp).toBe(SpeciesStore.fp);
        expect(row.x).toBeGreaterThanOrEqual(0);
        expect(row.x).toBeLessThan(SpeciesStore.model.width);
        expect(row.y).toBeLessThan(SpeciesStore.model.height);
        expect(row.d).toBeGreaterThan(0);
        expect(SpeciesStore.rowFor(id)).toEqual(row);
    });

    test('deleting a flower deletes its species', async () => {
        const [first, second] = await makeFlowers(2);

        await FlowerStore.deleteLocalFlower(first);

        expect(await speciesRepository.getSpecies(first)).toBeUndefined();
        expect(SpeciesStore.rowFor(first)).toBeUndefined();
        expect(await speciesRepository.getSpecies(second)).toBeDefined();
    });

    describe('deleting what is not a favourite', () => {
        test('the favourites keep their species under the new ids and are not classified again', async () => {
            const ids = await makeFlowers(4);
            const { fp } = await speciesRepository.getSpecies(ids[0]);
            // rows we know, the wasm does not give the same distance twice for every flower
            await speciesRepository.bulkPutSpecies([
                { id: ids[0], x: 0, y: 0, d: 0.1, fp },
                { id: ids[1], x: 1, y: 0, d: 0.2, fp },
                { id: ids[2], x: 0, y: 1, d: 0.3, fp },
                { id: ids[3], x: 1, y: 1, d: 0.4, fp },
            ]);
            await FlowerStore.addFlowerToFav(ids[1]);
            await FlowerStore.addFlowerToFav(ids[3]);
            const classify = vi.spyOn(getSpeciesClient(), 'classifyBatch');

            await FlowerStore.deleteNonFavourites();

            expect(await flowerRepository.listFlowerIds()).toEqual([1, 2]);
            expect(await db.species.toArray()).toEqual([
                { id: 1, x: 1, y: 0, d: 0.2, fp },
                { id: 2, x: 1, y: 1, d: 0.4, fp },
            ]);
            expect(classify).not.toHaveBeenCalled();
        });

        test('what the page knew by id is forgotten: flower 1 is not the flower 1 of before', async () => {
            const ids = await makeFlowers(2);
            const { fp } = await speciesRepository.getSpecies(ids[0]);
            await speciesRepository.bulkPutSpecies([
                { id: ids[0], x: 0, y: 0, d: 0.1, fp },
                { id: ids[1], x: 1, y: 1, d: 0.4, fp },
            ]);
            await SpeciesStore.ensureFor(ids);
            expect(SpeciesStore.rowFor(1)).toMatchObject({ x: 0, y: 0 });
            await FlowerStore.addFlowerToFav(ids[1]);

            await FlowerStore.deleteNonFavourites();

            expect(SpeciesStore.rowFor(1)).toBeUndefined();
            await SpeciesStore.ensureFor([1]);
            expect(SpeciesStore.rowFor(1)).toMatchObject({ x: 1, y: 1, d: 0.4 });
        });
    });

    describe('deleting everything', () => {
        test('the ids start again and the first new flower does not inherit the species of the first old one', async () => {
            const [old] = await makeFlowers(1);
            await speciesRepository.bulkPutSpecies([{ id: old, x: 99, y: 99, d: 9, fp: SpeciesStore.fp }]);
            expect(SpeciesStore.rowFor(old)).toBeDefined();

            await FlowerStore.deleteAllFlowers();
            expect(await db.species.count()).toBe(0);
            expect(SpeciesStore.rowFor(old)).toBeUndefined();

            await FlowerStore.makeLocalFlower();
            const [id] = await flowerRepository.listFlowerIds();
            expect(id).toBe(old);
            await SpeciesStore.whenIdle();
            const row = await speciesRepository.getSpecies(id);
            expect(row.x).toBeLessThan(SpeciesStore.model.width);
            expect(row.d).not.toBe(9);
        });

        test('the fine-tuned classifier is still there', async () => {
            await makeFlowers(1);
            await speciesRepository.putClassifier({ id: 'tuned', json: '{"tuned":true}' });
            await speciesRepository.putClassifier({ id: 'sub:abc:1,0', json: '{"sub":true}' });

            await FlowerStore.deleteAllFlowers();
            await FlowerStore.deleteNonFavourites();

            expect((await speciesRepository.getClassifier('tuned')).json).toBe('{"tuned":true}');
            expect(await speciesRepository.listSubmaps('abc')).toHaveLength(1);
        });

        test('a flower still being classified when everything is deleted leaves nothing behind, quietly', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            await FlowerStore.makeLocalFlower();
            // its species is being worked out now
            await FlowerStore.deleteAllFlowers();
            await SpeciesStore.whenIdle();

            expect(await db.species.count()).toBe(0);
            expect(SpeciesStore.summary.classified).toBe(0);
            expect(warn).not.toHaveBeenCalled();
        });
    });

    describe('fine-tuning the classifier', () => {
        const tune = () => SpeciesStore.fineTune({ epochs: 1, baseLR: 0.3, baseRadius: 1 });

        test('is kept, put in use, and every flower has its species for it', async () => {
            const ids = await makeFlowers(5);
            const builtIn = SpeciesStore.fp;

            expect(await tune()).toBe('done');

            expect(SpeciesStore.fp).not.toBe(builtIn);
            expect(SpeciesStore.hasTuned).toBe(true);
            expect((await speciesRepository.getClassifier('tuned')).json).toBeTypeOf('string');
            const rows = await Promise.all(ids.map((id) => speciesRepository.getSpecies(id)));
            expect(rows.every((row) => row.fp === SpeciesStore.fp && row.x !== null)).toBe(true);
            await SpeciesStore.ensureFor(ids);
            expect(ids.every((id) => SpeciesStore.rowFor(id) !== undefined)).toBe(true);
        });

        test('is the classifier in use again when the app is opened again', async () => {
            await makeFlowers(3);
            await tune();
            const tuned = SpeciesStore.fp;
            // a worker that starts again has the classifier of the wasm
            (await getFlowerEvolver()).loadSOM('');
            _resetSpeciesStoreForTests();
            createTestingPinia({ stubActions: false, createSpy: vi.fn });
            SpeciesStore = useSpeciesStore();
            expect(SpeciesStore.hasTuned).toBe(false);

            await SpeciesStore.start();

            expect(SpeciesStore.fp).toBe(tuned);
            expect(SpeciesStore.hasTuned).toBe(true);
        });

        test('is still there, and used for the new flowers, when every flower is deleted', async () => {
            await makeFlowers(2);
            await tune();
            const tuned = SpeciesStore.fp;

            await FlowerStore.deleteAllFlowers();
            const [id] = await makeFlowers(1);

            expect(await speciesRepository.getClassifier('tuned')).toBeDefined();
            expect((await speciesRepository.getSpecies(id)).fp).toBe(tuned);
        });

        test('can be removed: the built-in classifier is back and the flowers are classified again for it', async () => {
            const ids = await makeFlowers(3);
            const builtIn = SpeciesStore.fp;
            await tune();
            await speciesRepository.putClassifier({ id: `sub:${SpeciesStore.fp}:0,0`, json: '{}' });

            expect(await SpeciesStore.resetClassifier()).toBe('done');
            await SpeciesStore.whenIdle();

            expect(SpeciesStore.fp).toBe(builtIn);
            expect(SpeciesStore.hasTuned).toBe(false);
            expect(await db.classifier.count()).toBe(0);
            expect(await flowerRepository.listFlowerIds()).toEqual(ids);
            const rows = await Promise.all(ids.map((id) => speciesRepository.getSpecies(id)));
            expect(rows.every((row) => row.fp === builtIn && row.x !== null)).toBe(true);
        });

        test('with no flowers there is nothing to fine-tune on, and nothing changes', async () => {
            await SpeciesStore.start();
            const builtIn = SpeciesStore.fp;

            expect(await tune()).toBe('no-flowers');

            expect(SpeciesStore.fp).toBe(builtIn);
            expect(await speciesRepository.getClassifier('tuned')).toBeUndefined();
        });
    });
});
