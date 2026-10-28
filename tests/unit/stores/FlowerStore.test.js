import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import * as flowerRepository from '../../../src/services/flowerRepository';
import * as flowerApiClient from '../../../src/services/flowerApiClient';
import * as speciesRepository from '../../../src/services/speciesRepository';
import { getFlowerEvolver } from '../../../src/services/flowerEvolver';

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

// The species of the flowers is the business of SpeciesStore, what matters here is when this store
// asks for it and what it carries across a wipe.
vi.mock('../../../src/services/speciesRepository', () => ({
	bulkGetSpecies: vi.fn(),
	bulkPutSpecies: vi.fn(),
}));
const speciesStore = vi.hoisted(() => ({
	classifyLater: vi.fn(),
	removeFlower: vi.fn(() => Promise.resolve()),
	invalidate: vi.fn(),
}));
vi.mock('../../../src/stores/SpeciesStore', () => ({
	useSpeciesStore: () => speciesStore,
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

		test('deleteNonFavourites keeps the favourites renumbered 1..n, with their descriptions matched by position', async () => {
			// the action renumbers the ids array in place, so copy what each read was asked for
			const asked = {};
			flowerRepository.listFavouriteIds.mockResolvedValue([10, 4, 7]);
			flowerRepository.bulkGetFlowers.mockImplementation(async (ids) => {
				asked.flowers = [...ids];
				return [
					{ id: 10, genome: 'g10', image: 'i10' },
					{ id: 4, genome: 'g4', image: 'i4' },
					{ id: 7, genome: 'g7', image: 'i7' },
				];
			});
			// the second favourite has no description and the third has no species, so a position that
			// is off in one of them shows
			flowerRepository.bulkGetDescriptions.mockImplementation(async (ids) => {
				asked.descriptions = [...ids];
				return [{ id: 10, description: 'ten' }, undefined, { id: 7, description: 'seven' }];
			});
			speciesRepository.bulkGetSpecies.mockImplementation(async (ids) => {
				asked.species = [...ids];
				return [{ id: 10, x: 1, y: 1, d: 0.1, fp: 'a' }, { id: 4, x: 0, y: 1, d: 0.2, fp: 'a' }, undefined];
			});

			await FlowerStore.deleteNonFavourites();

			expect(asked).toEqual({ flowers: [10, 4, 7], descriptions: [10, 4, 7], species: [10, 4, 7] });
			// the species of the favourite that is now flower 1 is the one it had as flower 10
			expect(speciesRepository.bulkPutSpecies).toHaveBeenCalledWith([
				{ id: 1, x: 1, y: 1, d: 0.1, fp: 'a' }, { id: 2, x: 0, y: 1, d: 0.2, fp: 'a' },
			]);
			expect(speciesStore.invalidate).toHaveBeenCalledTimes(1);
			expect(flowerRepository.bulkAddFlowers.mock.calls[0][0].map((f) => [f.id, f.genome])).toEqual([[1, 'g10'], [2, 'g4'], [3, 'g7']]);
			expect(flowerRepository.bulkAddFavourites).toHaveBeenCalledWith([1, 2, 3]);
			expect(flowerRepository.bulkAddDescriptions).toHaveBeenCalledWith([
				{ id: 1, description: 'ten' }, { id: 3, description: 'seven' },
			]);
			expect(flowerRepository.wipeDatabase.mock.invocationCallOrder[0])
				.toBeLessThan(flowerRepository.bulkAddFlowers.mock.invocationCallOrder[0]);
			expect(flowerRepository.bulkAddFlowers.mock.invocationCallOrder[0])
				.toBeLessThan(speciesRepository.bulkPutSpecies.mock.invocationCallOrder[0]);
			// what is known by id is forgotten only when the new ids are in
			expect(speciesRepository.bulkPutSpecies.mock.invocationCallOrder[0])
				.toBeLessThan(speciesStore.invalidate.mock.invocationCallOrder[0]);
		});

		test('deleteNonFavourites waits for the flowers to be written before it adds anything that points at them', async () => {
			flowerRepository.listFavouriteIds.mockResolvedValue([3]);
			flowerRepository.bulkGetFlowers.mockResolvedValue([{ id: 3, genome: 'g3', image: 'i3' }]);
			flowerRepository.bulkGetDescriptions.mockResolvedValue([undefined]);
			speciesRepository.bulkGetSpecies.mockResolvedValue([undefined]);
			let writeFlowers;
			flowerRepository.bulkAddFlowers.mockReturnValue(new Promise((resolve) => {
				writeFlowers = resolve;
			}));

			const done = FlowerStore.deleteNonFavourites();
			await vi.waitFor(() => expect(flowerRepository.bulkAddFlowers).toHaveBeenCalled());
			expect(flowerRepository.bulkAddFavourites).not.toHaveBeenCalled();

			writeFlowers();
			await done;
			expect(flowerRepository.bulkAddFavourites).toHaveBeenCalledWith([1]);
		});
	});

	describe('species of the flowers (real wasm, mocked persistence)', () => {
		// a genome the wasm can draw, reproduce and mutate
		const realGenome = async () => {
			flowerRepository.addFlower.mockResolvedValueOnce(1);
			flowerRepository.getFlower.mockResolvedValueOnce({ id: 1, genome: 'g', image: 'i' });
			await FlowerStore.makeLocalFlower();
			const { genome } = flowerRepository.addFlower.mock.calls[0][0];
			vi.clearAllMocks();
			FlowerStore.localFlowers = [];
			return genome;
		};

		test('makeLocalFlower asks for the species of the flower it stored', async () => {
			flowerRepository.addFlower.mockResolvedValue(7);
			flowerRepository.getFlower.mockResolvedValue({ id: 7, genome: 'g', image: 'i' });

			await FlowerStore.makeLocalFlower();

			expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(7);
		});

		test('does not ask for it when the flower could not be made', async () => {
			const fe = await getFlowerEvolver();
			vi.spyOn(fe, 'makeFlower').mockRejectedValueOnce(new Error('wasm trapped'));

			await FlowerStore.makeLocalFlower();

			expect(speciesStore.classifyLater).not.toHaveBeenCalled();
			vi.restoreAllMocks();
		});

		test('redrawFlower asks for the species of the copy it stores, which has a new id', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockResolvedValue(12);

			await FlowerStore.redrawFlower({ id: 3, genome, image: 'old' });

			expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(12);
		});

		test('redrawFlower does not ask when the copy could not be stored', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockRejectedValue(new Error('disk full'));

			await FlowerStore.redrawFlower({ id: 3, genome, image: 'old' });

			expect(ErrorStore.push).toHaveBeenCalled();
			expect(speciesStore.classifyLater).not.toHaveBeenCalled();
		});

		test('localReproduce asks for the species of the child', async () => {
			const genome = await realGenome();
			FlowerStore.localSelected.flowers = [1, 2];
			flowerRepository.getFlower.mockImplementation(async (id) => ({ id, genome, image: 'i' }));
			flowerRepository.addFlower.mockResolvedValue(9);
			flowerRepository.addDescendant.mockResolvedValue();

			await FlowerStore.localReproduce();

			expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(9);
		});

		test('makeLocalMutation asks for the species of the mutation', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockResolvedValue(10);
			flowerRepository.addMutation.mockResolvedValue();
			flowerRepository.getFlower.mockResolvedValue({ id: 10, genome, image: 'i' });

			await FlowerStore.makeLocalMutation({ id: 1, genome });

			expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(10);
		});

		test('addRemoteFlowerToLocal asks for the species of the flower it brings in', async () => {
			const genome = await realGenome();
			vi.stubGlobal('fetch', vi.fn(async () => ({ text: async () => genome })));
			flowerRepository.addFlower.mockResolvedValue(11);

			await FlowerStore.addRemoteFlowerToLocal({ genome: 'remote-id' });

			await vi.waitFor(() => expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(11));
			vi.unstubAllGlobals();
		});

		test('deleteLocalFlower forgets the species of the flower', async () => {
			flowerRepository.removeFavourite.mockResolvedValue();
			flowerRepository.deleteDescription.mockResolvedValue();
			flowerRepository.deleteDescendant.mockResolvedValue();
			flowerRepository.deleteFlower.mockResolvedValue();
			flowerRepository.findMutationsByOriginalOrId.mockResolvedValue([]);

			await FlowerStore.deleteLocalFlower(5);

			expect(speciesStore.removeFlower).toHaveBeenCalledExactlyOnceWith(5);
		});

		test('deleteLocalFlower goes on and says so when the species could not be forgotten', async () => {
			flowerRepository.removeFavourite.mockResolvedValue();
			flowerRepository.deleteDescription.mockResolvedValue();
			flowerRepository.deleteDescendant.mockResolvedValue();
			flowerRepository.deleteFlower.mockResolvedValue();
			flowerRepository.findMutationsByOriginalOrId.mockResolvedValue([]);
			const failure = new Error('disk full');
			speciesStore.removeFlower.mockRejectedValueOnce(failure);

			await FlowerStore.deleteLocalFlower(5);

			expect(ErrorStore.push).toHaveBeenCalledWith(failure);
			expect(flowerRepository.deleteFlower).toHaveBeenCalledWith(5);
		});

		test('deleteAllFlowers forgets what was known by id once the database is wiped, the ids start again', async () => {
			await FlowerStore.deleteAllFlowers();

			expect(speciesStore.invalidate).toHaveBeenCalledTimes(1);
			expect(flowerRepository.wipeDatabase.mock.invocationCallOrder[0])
				.toBeLessThan(speciesStore.invalidate.mock.invocationCallOrder[0]);
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
