import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { db } from '../../../src/stores/FlowerStore/db';
import * as flowerRepository from '../../../src/services/flowerRepository';

describe('flowerRepository (real Dexie semantics via fake-indexeddb)', () => {
	beforeEach(async () => {
		if(db.isOpen()){
			await db.delete();
		}
		await db.open();
	});

	afterAll(async () => {
		await db.close();
	});

	test('ensureOpen opens the database if it was closed', async () => {
		db.close();
		expect(db.isOpen()).toBe(false);
		await flowerRepository.ensureOpen();
		expect(db.isOpen()).toBe(true);
	});

	describe('flowers', () => {
		test('addFlower/getFlower/countFlowers round-trip', async () => {
			expect(await flowerRepository.countFlowers()).toBe(0);
			const id = await flowerRepository.addFlower({ genome: 'g1', image: 'i1' });
			expect(await flowerRepository.countFlowers()).toBe(1);
			expect(await flowerRepository.getFlower(id)).toEqual({ id, genome: 'g1', image: 'i1' });
		});

		test('listFlowers returns most-recently-added first, honoring limit/offset', async () => {
			const id1 = await flowerRepository.addFlower({ genome: 'g1', image: 'i1' });
			const id2 = await flowerRepository.addFlower({ genome: 'g2', image: 'i2' });
			const id3 = await flowerRepository.addFlower({ genome: 'g3', image: 'i3' });

			const page1 = await flowerRepository.listFlowers({ limit: 2, offset: 0 });
			expect(page1.map((f) => f.id)).toEqual([id3, id2]);

			const page2 = await flowerRepository.listFlowers({ limit: 2, offset: 2 });
			expect(page2.map((f) => f.id)).toEqual([id1]);
		});

		test('bulkAddFlowers/bulkGetFlowers/deleteFlower', async () => {
			await flowerRepository.bulkAddFlowers([
				{ id: 1, genome: 'g1', image: 'i1' },
				{ id: 2, genome: 'g2', image: 'i2' },
			]);
			const got = await flowerRepository.bulkGetFlowers([1, 2]);
			expect(got.map((f) => f.genome)).toEqual(['g1', 'g2']);

			await flowerRepository.deleteFlower(1);
			expect(await flowerRepository.getFlower(1)).toBeUndefined();
		});
	});

	describe('favourites', () => {
		test('addFavourite/isFavourited/removeFavourite/countFavourites', async () => {
			const id = await flowerRepository.addFlower({ genome: 'g', image: 'i' });
			expect(await flowerRepository.isFavourited(id)).toBe(false);

			await flowerRepository.addFavourite(id);
			expect(await flowerRepository.isFavourited(id)).toBe(true);
			expect(await flowerRepository.countFavourites()).toBe(1);

			await flowerRepository.removeFavourite(id);
			expect(await flowerRepository.isFavourited(id)).toBe(false);
		});

		test('listFavouriteIds and bulkAddFavourites', async () => {
			await flowerRepository.bulkAddFavourites([5, 6, 7]);
			expect(await flowerRepository.listFavouriteIds()).toEqual([5, 6, 7]);
		});
	});

	describe('mutations', () => {
		test('countMutations: no original counts everything, an original scopes to it', async () => {
			await flowerRepository.addMutation({ id: 10, original: 1 });
			await flowerRepository.addMutation({ id: 11, original: 1 });
			await flowerRepository.addMutation({ id: 12, original: 2 });

			expect(await flowerRepository.countMutations()).toBe(3);
			expect(await flowerRepository.countMutations(1)).toBe(2);
			expect(await flowerRepository.countMutations(2)).toBe(1);
		});

		test('listMutationsByOriginal is scoped and reverse-ordered', async () => {
			await flowerRepository.addMutation({ id: 10, original: 1 });
			await flowerRepository.addMutation({ id: 11, original: 1 });
			await flowerRepository.addMutation({ id: 12, original: 2 });

			const rows = await flowerRepository.listMutationsByOriginal({ original: 1, limit: 10, offset: 0 });
			expect(rows.map((r) => r.id)).toEqual([11, 10]);
		});

		test('findMutationsByOriginalOrId matches either field', async () => {
			await flowerRepository.addMutation({ id: 10, original: 1 });

			expect((await flowerRepository.findMutationsByOriginalOrId(1)).map((r) => r.id)).toEqual([10]);
			expect((await flowerRepository.findMutationsByOriginalOrId(10)).map((r) => r.id)).toEqual([10]);
		});

		test('bulkDeleteMutations removes the given rows', async () => {
			await flowerRepository.addMutation({ id: 20, original: 1 });
			await flowerRepository.addMutation({ id: 21, original: 1 });

			await flowerRepository.bulkDeleteMutations([20, 21]);
			expect(await flowerRepository.countMutations(1)).toBe(0);
		});
	});

	describe('descendants', () => {
		test('countDescendantsByParent counts a match on either father or mother', async () => {
			await flowerRepository.addDescendant({ id: 30, father: 1, mother: 2 });
			await flowerRepository.addDescendant({ id: 31, father: 3, mother: 1 });

			expect(await flowerRepository.countDescendantsByParent(1)).toBe(2);
			expect(await flowerRepository.countDescendantsByParent(2)).toBe(1);
		});

		test('countDescendantsByParents requires both to match', async () => {
			await flowerRepository.addDescendant({ id: 30, father: 1, mother: 2 });
			await flowerRepository.addDescendant({ id: 31, father: 1, mother: 3 });

			expect(await flowerRepository.countDescendantsByParents(1, 2)).toBe(1);
			expect(await flowerRepository.countDescendantsByParents(1, 3)).toBe(1);
			expect(await flowerRepository.countDescendantsByParents(1, 99)).toBe(0);
		});

		test('listDescendantsByParent/listDescendantsByParents are reverse-ordered', async () => {
			await flowerRepository.addDescendant({ id: 40, father: 1, mother: 2 });
			await flowerRepository.addDescendant({ id: 41, father: 1, mother: 2 });

			expect((await flowerRepository.listDescendantsByParent({ fatherID: 1, limit: 10, offset: 0 })).map((d) => d.id)).toEqual([41, 40]);
			expect((await flowerRepository.listDescendantsByParents({ fatherID: 1, motherID: 2, limit: 10, offset: 0 })).map((d) => d.id)).toEqual([41, 40]);
		});

		test('deleteDescendant removes the row', async () => {
			await flowerRepository.addDescendant({ id: 50, father: 1, mother: 2 });
			await flowerRepository.deleteDescendant(50);
			expect(await flowerRepository.countDescendantsByParent(1)).toBe(0);
		});
	});

	describe('descriptions', () => {
		test('addDescription/bulkGetDescriptions/deleteDescription', async () => {
			await flowerRepository.addDescription({ id: 1, description: 'a red flower' });
			expect(await flowerRepository.bulkGetDescriptions([1])).toEqual([{ id: 1, description: 'a red flower' }]);

			await flowerRepository.deleteDescription(1);
			expect(await flowerRepository.bulkGetDescriptions([1])).toEqual([undefined]);
		});

		test('bulkAddDescriptions and listDescriptions', async () => {
			await flowerRepository.bulkAddDescriptions([
				{ id: 1, description: 'first' },
				{ id: 2, description: 'second' },
			]);
			const rows = await flowerRepository.listDescriptions({ limit: 10, offset: 0 });
			expect(rows.map((r) => r.description).sort()).toEqual(['first', 'second']);
		});
	});

	describe('wipeDatabase', () => {
		test('clears every table and leaves the database open', async () => {
			await flowerRepository.addFlower({ genome: 'g', image: 'i' });
			await flowerRepository.wipeDatabase();
			expect(await flowerRepository.countFlowers()).toBe(0);
			expect(db.isOpen()).toBe(true);
		});
	});
});
