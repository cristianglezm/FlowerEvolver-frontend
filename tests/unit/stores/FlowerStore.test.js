import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import * as flowerRepository from '../../../src/services/flowerRepository';
import * as flowerApiClient from '../../../src/services/flowerApiClient';

// flowerRepository (Dexie) and flowerApiClient (axios) are exactly what's worth
// isolating here - IndexedDB and the network.
vi.mock('../../../src/services/flowerRepository', () => ({
	ensureOpen: vi.fn(),
	countFlowers: vi.fn(),
	addFlower: vi.fn(),
	getFlower: vi.fn(),
	bulkGetFlowers: vi.fn(),
	bulkAddFlowers: vi.fn(),
	deleteFlower: vi.fn(),
	listFlowers: vi.fn(),
	countFavourites: vi.fn(),
	isFavourited: vi.fn(),
	addFavourite: vi.fn(),
	removeFavourite: vi.fn(),
	listFavouriteIds: vi.fn(),
	bulkAddFavourites: vi.fn(),
	countMutations: vi.fn(),
	addMutation: vi.fn(),
	listMutationsByOriginal: vi.fn(),
	findMutationsByOriginalOrId: vi.fn(),
	bulkDeleteMutations: vi.fn(),
	countDescendantsByParent: vi.fn(),
	countDescendantsByParents: vi.fn(),
	addDescendant: vi.fn(),
	listDescendantsByParent: vi.fn(),
	listDescendantsByParents: vi.fn(),
	deleteDescendant: vi.fn(),
	bulkGetDescriptions: vi.fn(),
	deleteDescription: vi.fn(),
	bulkAddDescriptions: vi.fn(),
	wipeDatabase: vi.fn(),
}));
vi.mock('../../../src/services/flowerApiClient', () => ({
	API: 'http://test-api.local/',
	mapAxiosError: vi.fn((e, offlineMessage) => (e.response === undefined ? offlineMessage : e.response.data)),
	getFlowersCount: vi.fn(),
	getFlowers: vi.fn(),
	createFlower: vi.fn(),
	shareFlower: vi.fn(),
	reproduceRemote: vi.fn(),
	getMutationsCount: vi.fn(),
	getMutations: vi.fn(),
	mutateRemote: vi.fn(),
	getAncestorsCount: vi.fn(),
	getAncestors: vi.fn(),
}));

describe('FlowerStore', () => {
	let FlowerStore;
	let ErrorStore;

	beforeEach(() => {
		vi.clearAllMocks();
		// stubActions: false - we want FlowerStore's own actions to run for
		// real; only its collaborators (the two mocked services above) are faked.
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		FlowerStore = useFlowerStore();
		ErrorStore = useErrorStore();
		vi.spyOn(ErrorStore, 'push');
	});

	describe('counts', () => {
		test('getLocalFlowersCount delegates to the repository', async () => {
			flowerRepository.countFlowers.mockResolvedValue(42);
			await expect(FlowerStore.getLocalFlowersCount()).resolves.toBe(42);
		});

		test('getRemoteFlowersCount returns 0 and records the error on failure', async () => {
			const err = new Error('network down');
			flowerApiClient.getFlowersCount.mockRejectedValue(err);
			await expect(FlowerStore.getRemoteFlowersCount()).resolves.toBe(0);
			expect(ErrorStore.push).toHaveBeenCalledWith(err);
		});

		test('getLocalMutationsCount(original) is scoped to the given original', async () => {
			flowerRepository.countMutations.mockResolvedValue(3);
			await expect(FlowerStore.getLocalMutationsCount(9)).resolves.toBe(3);
			expect(flowerRepository.countMutations).toHaveBeenCalledWith(9);
		});
	});

	describe('local flower lifecycle (real wasm, mocked persistence)', () => {
		test('makeLocalFlower draws a real flower and stores it through the repository', async () => {
			flowerRepository.addFlower.mockResolvedValue(7);
			flowerRepository.getFlower.mockResolvedValue({ id: 7, genome: 'stored-genome', image: 'stored-image' });

			await FlowerStore.makeLocalFlower();

			expect(flowerRepository.ensureOpen).toHaveBeenCalled();
			expect(flowerRepository.addFlower).toHaveBeenCalled();
			const [savedFlower] = flowerRepository.addFlower.mock.calls[0];
			expect(savedFlower.genome).toContain('"Flower"');
			expect(savedFlower.image).toMatch(/^data:image\/png;base64,/);
			expect(FlowerStore.localFlowers[0]).toEqual({ id: 7, genome: 'stored-genome', image: 'stored-image' });
		});

		test('addFlowerToFav adds via the repository and unshifts the resolved flower', async () => {
			flowerRepository.addFavourite.mockResolvedValue(3);
			flowerRepository.getFlower.mockResolvedValue({ id: 3, genome: 'g', image: 'i' });

			await FlowerStore.addFlowerToFav(3);
			await Promise.resolve();

			expect(flowerRepository.addFavourite).toHaveBeenCalledWith(3);
			expect(FlowerStore.favourites[0]).toEqual({ id: 3, genome: 'g', image: 'i' });
		});

		test('deleteLocalFlower removes the flower from every table via the repository', async () => {
			flowerRepository.removeFavourite.mockResolvedValue();
			flowerRepository.deleteDescription.mockResolvedValue();
			flowerRepository.deleteDescendant.mockResolvedValue();
			flowerRepository.deleteFlower.mockResolvedValue();
			flowerRepository.findMutationsByOriginalOrId.mockResolvedValue([]);
			FlowerStore.localFlowers = [{ id: 5 }, { id: 6 }];

			await FlowerStore.deleteLocalFlower(5);

			expect(flowerRepository.deleteFlower).toHaveBeenCalledWith(5);
			expect(flowerRepository.removeFavourite).toHaveBeenCalledWith(5);
			expect(FlowerStore.localFlowers).toEqual([{ id: 6 }]);
		});
	});

	describe('remote actions and error mapping', () => {
		test('shareFlower surfaces the offline message when the server is unreachable', async () => {
			flowerApiClient.shareFlower.mockRejectedValue({ response: undefined });

			await FlowerStore.shareFlower('genome-json');

			expect(flowerApiClient.mapAxiosError).toHaveBeenCalledWith({ response: undefined }, 'cannot share flower, server offline');
			expect(ErrorStore.push).toHaveBeenCalledWith('cannot share flower, server offline');
		});

		test('makeRemoteFlower prepends the new flower to remoteFlowers and lastAdded', async () => {
			const flower = { id: 1, genome: 'g', image: 'i' };
			flowerApiClient.createFlower.mockResolvedValue(flower);

			await FlowerStore.makeRemoteFlower();

			expect(FlowerStore.remoteFlowers[0]).toEqual(flower);
			expect(FlowerStore.lastAdded[0]).toEqual(flower);
		});

		test('remoteReproduce requires two selected flowers before calling the API', async () => {
			FlowerStore.remoteSelected.flowers = [1];

			await FlowerStore.remoteReproduce();

			expect(ErrorStore.push).toHaveBeenCalledWith('There are no flowers selected');
			expect(flowerApiClient.reproduceRemote).not.toHaveBeenCalled();
		});

		test('remoteReproduce reproduces the two selected flowers', async () => {
			FlowerStore.remoteSelected.flowers = [1, 2];
			const child = { id: 3, genome: 'g', image: 'i' };
			flowerApiClient.reproduceRemote.mockResolvedValue(child);

			await FlowerStore.remoteReproduce();

			expect(flowerApiClient.reproduceRemote).toHaveBeenCalledWith(1, 2);
			expect(FlowerStore.ancestors[0]).toEqual(child);
		});
	});
});
