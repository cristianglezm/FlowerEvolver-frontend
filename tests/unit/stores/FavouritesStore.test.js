import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useFavouritesStore } from '../../../src/stores/FavouritesStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { listenToList } from '../../../src/services/listEvents';
import * as flowerRepository from '../../../src/services/flowerRepository';

vi.mock('../../../src/services/flowerRepository', () => ({
	isFavourited: vi.fn(),
	addFavourite: vi.fn(),
	removeFavourite: vi.fn(),
	getFlower: vi.fn(),
}));

describe('FavouritesStore', () => {
	let FavouritesStore;
	let ErrorStore;
	// what the views that list the favourites are told
	let told;
	let stopListening;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		FavouritesStore = useFavouritesStore();
		ErrorStore = useErrorStore();
		vi.spyOn(ErrorStore, 'push');
		told = [];
		stopListening = listenToList('favourites', {
			added: (flower) => told.push(['added', flower]),
			removed: (id) => told.push(['removed', id]),
			reset: () => told.push(['reset']),
		});
	});

	afterEach(() => {
		stopListening();
	});

	describe('isFavourited', () => {
		test.each([true, false])('says what the repository says: %s', async (answer) => {
			flowerRepository.isFavourited.mockResolvedValue(answer);

			await expect(FavouritesStore.isFavourited(4)).resolves.toBe(answer);

			expect(flowerRepository.isFavourited).toHaveBeenCalledExactlyOnceWith(4);
		});

		test('records the error when the table cannot be read, and says nothing', async () => {
			const failure = new Error('IndexedDB is closed');
			flowerRepository.isFavourited.mockRejectedValue(failure);

			await expect(FavouritesStore.isFavourited(4)).resolves.toBeUndefined();

			expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith(failure);
		});
	});

	describe('addFlowerToFav', () => {
		test('adds it to the table and tells the lists about the flower that the table has', async () => {
			flowerRepository.addFavourite.mockResolvedValue(3);
			flowerRepository.getFlower.mockResolvedValue({ id: 3, genome: 'g', image: 'i' });

			await FavouritesStore.addFlowerToFav(3);
			await vi.waitFor(() => expect(told).toHaveLength(1));

			expect(flowerRepository.addFavourite).toHaveBeenCalledExactlyOnceWith(3);
			// the id that the table answered is the one that is read
			expect(flowerRepository.getFlower).toHaveBeenCalledExactlyOnceWith(3);
			expect(told).toEqual([['added', { id: 3, genome: 'g', image: 'i' }]]);
			expect(ErrorStore.push).not.toHaveBeenCalled();
		});

		test('records the error and tells nobody when it cannot be added (it is one already, say)', async () => {
			const failure = new Error('already a favourite');
			flowerRepository.addFavourite.mockRejectedValue(failure);

			await FavouritesStore.addFlowerToFav(3);
			await vi.waitFor(() => expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith(failure));

			expect(flowerRepository.getFlower).not.toHaveBeenCalled();
			expect(told).toEqual([]);
		});

		test('records the error and tells nobody when the flower cannot be read after it was added', async () => {
			const failure = new Error('IndexedDB is closed');
			flowerRepository.addFavourite.mockResolvedValue(3);
			flowerRepository.getFlower.mockRejectedValue(failure);

			await FavouritesStore.addFlowerToFav(3);
			await vi.waitFor(() => expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith(failure));

			expect(told).toEqual([]);
		});

		test('does not wait for the table: the card that asks does not have to', async () => {
			let finish;
			flowerRepository.addFavourite.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
			flowerRepository.getFlower.mockResolvedValue({ id: 3 });

			await FavouritesStore.addFlowerToFav(3);
			expect(told).toEqual([]);

			finish(3);
			await vi.waitFor(() => expect(told).toHaveLength(1));
		});
	});

	describe('removeFlowerFromFav', () => {
		test('removes it from the table and tells the lists at once', () => {
			FavouritesStore.removeFlowerFromFav(3);

			expect(flowerRepository.removeFavourite).toHaveBeenCalledExactlyOnceWith(3);
			expect(told).toEqual([['removed', 3]]);
		});
	});

	test('keeps no list: what is a favourite is what the table says', () => {
		expect(FavouritesStore.$state).toEqual({});
	});
});
