import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, test, expect, afterAll } from 'vitest';

describe('db', () => {
    let db;
    afterAll(async () => {
        await db?.close();
    });

    test('upgrading a version 1 database keeps its data and adds the species tables', async () => {
        // a database as users of the previous release have it
        const old = new Dexie('FlowerEvolver');
        old.version(1).stores({
            flowers: '++id',
            mutations: 'id, original',
            descendants: 'id, father, mother',
            favourites: ', &id',
            descriptions: 'id, description'
        });
        const id = await old.flowers.add({ genome: 'g1', image: 'i1' });
        await old.favourites.add(id, id);
        await old.descriptions.add({ id, description: 'a flower' });
        await old.mutations.add({ id: 7, original: id });
        old.close();

        ({ db } = await import('../../../src/stores/FlowerStore/db'));
        await db.open();

        expect(db.verno).toBe(2);
        expect(await db.flowers.get(id)).toEqual({ id, genome: 'g1', image: 'i1' });
        expect(await db.favourites.toArray()).toEqual([id]);
        expect(await db.descriptions.get(id)).toEqual({ id, description: 'a flower' });
        expect(await db.mutations.get(7)).toEqual({ id: 7, original: id });
        expect(await db.species.count()).toBe(0);
        expect(await db.classifier.count()).toBe(0);
    });
});
