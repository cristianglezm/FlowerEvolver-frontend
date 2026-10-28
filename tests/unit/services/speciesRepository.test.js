// tests/unit/setup/jsdom.js
import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { db } from '../../../src/stores/FlowerStore/db';
import * as speciesRepository from '../../../src/services/speciesRepository';

describe('speciesRepository (real Dexie semantics via fake-indexeddb)', () => {
	beforeEach(async () => {
		if(db.isOpen()){
			await db.delete();
		}
		await db.open();
	});

	afterAll(async () => {
		await db.close();
	});

	describe('species', () => {
		test('bulkPutSpecies/getSpecies/bulkGetSpecies/deleteSpecies round-trip', async () => {
			await speciesRepository.bulkPutSpecies([
				{ id: 1, x: 0, y: 0, d: 0.5, fp: 'a' },
				{ id: 2, x: 1, y: 0, d: 0.7, fp: 'a' },
			]);
			expect(await speciesRepository.getSpecies(1)).toEqual({ id: 1, x: 0, y: 0, d: 0.5, fp: 'a' });
			expect((await speciesRepository.bulkGetSpecies([2, 3, 1])).map((r) => r?.id)).toEqual([2, undefined, 1]);
			await speciesRepository.deleteSpecies(1);
			expect(await speciesRepository.getSpecies(1)).toBeUndefined();
		});

		test('bulkPutSpecies replaces the row of a flower that is classified again', async () => {
			await speciesRepository.bulkPutSpecies([{ id: 1, x: 0, y: 0, d: 0.5, fp: 'old' }]);
			await speciesRepository.bulkPutSpecies([{ id: 1, x: 2, y: 1, d: 0.1, fp: 'new' }]);
			expect(await speciesRepository.getSpecies(1)).toEqual({ id: 1, x: 2, y: 1, d: 0.1, fp: 'new' });
		});

		test('listCurrent only returns the rows of the given classifier, including unclassifiable ones', async () => {
			await speciesRepository.bulkPutSpecies([
				{ id: 1, x: 0, y: 0, d: 0.5, fp: 'a' },
				{ id: 2, x: 0, y: 0, d: 0.5, fp: 'old' },
				{ id: 3, x: null, y: null, d: null, fp: 'a' },
			]);
			const rows = await speciesRepository.listCurrent('a');
			expect(rows.map((r) => r.id).sort()).toEqual([1, 3]);
		});
	});

	describe('flowers of a species', () => {
		// by id: 1 current, 2 old, 3 old, 4 current, 5 old, 6 current, all in cell (1, 2)
		beforeEach(async () => {
			const fps = { 1: 'a', 2: 'old', 3: 'old', 4: 'a', 5: 'old', 6: 'a' };
			await speciesRepository.bulkPutSpecies([
				...Object.entries(fps).map(([id, fp]) => ({ id: Number(id), x: 1, y: 2, d: 0.1, fp })),
				{ id: 7, x: 0, y: 0, d: 0.1, fp: 'a' }, // another cell
				{ id: 8, x: null, y: null, d: null, fp: 'a' }, // could not be classified
			]);
		});

		test('listFlowerIdsByCell is newest first and only has current rows of that cell', async () => {
			expect(await speciesRepository.listFlowerIdsByCell({ x: 1, y: 2, fp: 'a', limit: 10, offset: 0 })).toEqual([6, 4, 1]);
		});

		test('offset only counts current rows, so a page never has holes where stale rows were', async () => {
			expect(await speciesRepository.listFlowerIdsByCell({ x: 1, y: 2, fp: 'a', limit: 1, offset: 2 })).toEqual([1]);
			expect(await speciesRepository.listFlowerIdsByCell({ x: 1, y: 2, fp: 'a', limit: 2, offset: 1 })).toEqual([4, 1]);
			expect(await speciesRepository.listFlowerIdsByCell({ x: 1, y: 2, fp: 'a', limit: 5, offset: 3 })).toEqual([]);
		});

		test('countByCell counts the same rows listFlowerIdsByCell pages through', async () => {
			expect(await speciesRepository.countByCell({ x: 1, y: 2, fp: 'a' })).toBe(3);
			expect(await speciesRepository.countByCell({ x: 0, y: 0, fp: 'a' })).toBe(1);
			expect(await speciesRepository.countByCell({ x: 3, y: 3, fp: 'a' })).toBe(0);
		});

		test('a sub-species only matches rows split with that sub-map, at that cell', async () => {
			await speciesRepository.bulkPutSpecies([
				{ id: 1, x: 1, y: 2, d: 0.1, fp: 'a', sx: 0, sy: 0, sfp: 's1' },
				{ id: 4, x: 1, y: 2, d: 0.1, fp: 'a', sx: 1, sy: 0, sfp: 's1' },
				{ id: 6, x: 1, y: 2, d: 0.1, fp: 'a', sx: 0, sy: 0, sfp: 'older-sub-map' },
			]);
			const sub = { x: 0, y: 0, fp: 's1' };
			expect(await speciesRepository.listFlowerIdsByCell({ x: 1, y: 2, fp: 'a', sub, limit: 10, offset: 0 })).toEqual([1]);
			expect(await speciesRepository.countByCell({ x: 1, y: 2, fp: 'a', sub })).toBe(1);
			expect(await speciesRepository.countByCell({ x: 1, y: 2, fp: 'a', sub: { x: 1, y: 0, fp: 's1' } })).toBe(1);
		});
	});

	describe('classifier', () => {
		test('putClassifier/getClassifier/deleteClassifier round-trip', async () => {
			await speciesRepository.putClassifier({ id: 'tuned', json: '{}' });
			expect(await speciesRepository.getClassifier('tuned')).toEqual({ id: 'tuned', json: '{}' });
			await speciesRepository.putClassifier({ id: 'tuned', json: '{"v":2}' });
			expect((await speciesRepository.getClassifier('tuned')).json).toBe('{"v":2}');
			await speciesRepository.deleteClassifier('tuned');
			expect(await speciesRepository.getClassifier('tuned')).toBeUndefined();
		});

		test('listSubmaps only returns the sub-species maps of that classifier', async () => {
			await speciesRepository.putClassifier({ id: 'tuned', json: '{}' });
			await speciesRepository.putClassifier({ id: 'sub:abc:1,2', json: '1' });
			await speciesRepository.putClassifier({ id: 'sub:abc:0,0', json: '2' });
			await speciesRepository.putClassifier({ id: 'sub:other:1,2', json: '3' });
			const maps = await speciesRepository.listSubmaps('abc');
			expect(maps.map((m) => m.id).sort()).toEqual(['sub:abc:0,0', 'sub:abc:1,2']);
		});

		test('clearClassifier removes the tuned classifier and every sub-species map', async () => {
			await speciesRepository.putClassifier({ id: 'tuned', json: '{}' });
			await speciesRepository.putClassifier({ id: 'sub:abc:1,2', json: '1' });
			await speciesRepository.clearClassifier();
			expect(await db.classifier.count()).toBe(0);
		});
	});

	describe('sub-species', () => {
		beforeEach(async () => {
			await speciesRepository.bulkPutSpecies([
				{ id: 1, x: 1, y: 0, d: 0.5, fp: 'a', sx: 0, sy: 0, sfp: 's' },
				{ id: 2, x: 1, y: 0, d: 0.5, fp: 'a' },
				{ id: 3, x: 1, y: 0, d: 0.5, fp: 'a', sx: 1, sy: 0, sfp: 'older' },
				{ id: 4, x: 1, y: 0, d: 0.5, fp: 'old' },
				{ id: 5, x: 2, y: 0, d: 0.5, fp: 'a', sx: 0, sy: 0, sfp: 's' },
			]);
		});

		test('listAllFlowerIdsByCell gives every current flower of the species, not a page', async () => {
			expect((await speciesRepository.listAllFlowerIdsByCell({ x: 1, y: 0, fp: 'a' })).sort()).toEqual([1, 2, 3]);
		});

		test('listRowsWithoutSub gives the current rows of the species that the map subfp did not place', async () => {
			const rows = await speciesRepository.listRowsWithoutSub({ x: 1, y: 0, fp: 'a', subfp: 's' });

			expect(rows.map((row) => row.id).sort()).toEqual([2, 3]);
		});

		test('countSubCells counts the flowers of the species in each sub-species of that map, and no other', async () => {
			await speciesRepository.bulkPutSpecies([
				{ id: 6, x: 1, y: 0, d: 0.5, fp: 'a', sx: 0, sy: 0, sfp: 's' },
				{ id: 7, x: 1, y: 0, d: 0.5, fp: 'a', sx: null, sy: null, sfp: 's' },
			]);

			const counts = await speciesRepository.countSubCells({ x: 1, y: 0, fp: 'a', subfp: 's' });

			// 1 and 6 are in (0, 0), 5 is of another species, 3 was placed by another map, 7 could not be placed
			expect(counts).toEqual(new Map([['0,0', 2]]));
		});

		test('clearSubmaps removes the sub-species maps of every classifier and keeps the fine-tuned one', async () => {
			await speciesRepository.putClassifier({ id: 'tuned', json: '{}' });
			await speciesRepository.putClassifier({ id: 'sub:a:1,0', json: '1' });
			await speciesRepository.putClassifier({ id: 'sub:b:0,0', json: '2' });

			await speciesRepository.clearSubmaps();

			expect((await db.classifier.toArray()).map((record) => record.id)).toEqual(['tuned']);
		});

		test('clearSubRows with a cell takes the sub-species off the rows of that species only', async () => {
			await speciesRepository.clearSubRows({ x: 1, y: 0 });

			expect(await speciesRepository.getSpecies(1)).toEqual({ id: 1, x: 1, y: 0, d: 0.5, fp: 'a' });
			expect(await speciesRepository.getSpecies(3)).toEqual({ id: 3, x: 1, y: 0, d: 0.5, fp: 'a' });
			expect(await speciesRepository.getSpecies(5)).toMatchObject({ sx: 0, sy: 0, sfp: 's' });
		});

		test('clearSubRows without a cell takes it off every row', async () => {
			await speciesRepository.clearSubRows();

			expect((await db.species.toArray()).filter((row) => 'sfp' in row)).toEqual([]);
		});
	});
});
