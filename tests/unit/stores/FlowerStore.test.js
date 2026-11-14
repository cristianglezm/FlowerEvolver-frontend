import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useSettingsStore } from '../../../src/stores/SettingsStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import * as flowerRepository from '../../../src/services/flowerRepository';
import * as flowerApiClient from '../../../src/services/flowerApiClient';
import * as speciesRepository from '../../../src/services/speciesRepository';
import { getFlowerEvolver } from '../../../src/services/flowerEvolver';
import { listenToList } from '../../../src/services/listEvents';

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
	getDescendantsCount: vi.fn(),
	getDescendants: vi.fn(),
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
	let SettingsStore;
	let ErrorStore;
	// what the views that show the list of the local flowers are told
	let announced;
	let stopListening;
	// the remote lists: what they were told, in order
	let toRemote;
	let toLastAdded;
	let toFavourites;
	// the lists of mutations: what they were told, with the relation that came with it
	let toLocalMutations;
	let toRemoteMutations;
	// the lists of descendants
	let toLocalDescendants;
	let toRemoteDescendants;
	let stopRemote;

	beforeEach(() => {
		vi.clearAllMocks();
		announced = [];
		toRemote = [];
		toLastAdded = [];
		toFavourites = [];
		toLocalMutations = [];
		toRemoteMutations = [];
		toLocalDescendants = [];
		toRemoteDescendants = [];
		stopRemote = [
			listenToList('remote', { added: (flower) => toRemote.push(flower) }),
			listenToList('lastAdded', { added: (flower) => toLastAdded.push(flower) }),
			listenToList('localMutations', {
				added: (flower, relation) => toLocalMutations.push(['added', flower, relation]),
				removed: (id) => toLocalMutations.push(['removed', id]),
				reset: () => toLocalMutations.push(['reset']),
			}),
			listenToList('remoteMutations', { added: (flower, relation) => toRemoteMutations.push([flower, relation]) }),
			listenToList('localDescendants', {
				added: (flower, relation) => toLocalDescendants.push(['added', flower, relation]),
				removed: (id) => toLocalDescendants.push(['removed', id]),
				reset: () => toLocalDescendants.push(['reset']),
			}),
			listenToList('remoteDescendants', { added: (flower, relation) => toRemoteDescendants.push([flower, relation]) }),
			listenToList('favourites', {
				added: (flower) => toFavourites.push(['added', flower]),
				removed: (id) => toFavourites.push(['removed', id]),
				reset: () => toFavourites.push(['reset']),
			}),
		];
		stopListening = listenToList('local', {
			added: (flower) => announced.push(['added', flower]),
			removed: (id) => announced.push(['removed', id]),
			reset: () => announced.push(['reset']),
		});
		// stubActions: false - we want FlowerStore's own actions to run for
		// real; only its collaborators (the two mocked services above) are faked.
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		FlowerStore = useFlowerStore();
		SettingsStore = useSettingsStore();
		ErrorStore = useErrorStore();
		vi.spyOn(ErrorStore, 'push');
	});

	afterEach(() => {
		stopListening();
		stopRemote.forEach((stop) => stop());
	});

	describe('counts', () => {
		test('getRemoteDescendantsCount asks for one parent or for two, and returns 0 and records the error on failure', async () => {
			flowerApiClient.getDescendantsCount.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
			await expect(FlowerStore.getRemoteDescendantsCount(7)).resolves.toBe(4);
			await expect(FlowerStore.getRemoteDescendantsCount(7, 8)).resolves.toBe(2);
			expect(flowerApiClient.getDescendantsCount.mock.calls).toEqual([[7, undefined], [7, 8]]);

			const failure = new Error('offline');
			flowerApiClient.getDescendantsCount.mockRejectedValueOnce(failure);
			await expect(FlowerStore.getRemoteDescendantsCount(7)).resolves.toBe(0);
			expect(ErrorStore.push).toHaveBeenCalledWith(failure);
		});

		test('getRemoteFlowersCount returns 0 and records the error on failure', async () => {
			const err = new Error('network down');
			flowerApiClient.getFlowersCount.mockRejectedValue(err);
			await expect(FlowerStore.getRemoteFlowersCount()).resolves.toBe(0);
			expect(ErrorStore.push).toHaveBeenCalledWith(err);
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
			expect(announced).toEqual([['added', { id: 7, genome: 'stored-genome', image: 'stored-image' }]]);
		});

		test('addFlowerToFav adds via the repository and announces the resolved flower to the favourites', async () => {
			flowerRepository.addFavourite.mockResolvedValue(3);
			flowerRepository.getFlower.mockResolvedValue({ id: 3, genome: 'g', image: 'i' });

			await FlowerStore.addFlowerToFav(3);
			await vi.waitFor(() => expect(toFavourites).toHaveLength(1));

			expect(flowerRepository.addFavourite).toHaveBeenCalledWith(3);
			expect(toFavourites).toEqual([['added', { id: 3, genome: 'g', image: 'i' }]]);
		});

		test('addFlowerToFav records the error and announces nothing when it cannot be added', async () => {
			const failure = new Error('already a favourite');
			flowerRepository.addFavourite.mockRejectedValue(failure);

			await FlowerStore.addFlowerToFav(3);
			await vi.waitFor(() => expect(ErrorStore.push).toHaveBeenCalledWith(failure));

			expect(toFavourites).toEqual([]);
		});

		test('removeFlowerFromFav removes it via the repository and announces the removal', () => {
			FlowerStore.removeFlowerFromFav(3);

			expect(flowerRepository.removeFavourite).toHaveBeenCalledWith(3);
			expect(toFavourites).toEqual([['removed', 3]]);
		});

		test('deleteLocalFlower removes the flower from every table via the repository', async () => {
			flowerRepository.removeFavourite.mockResolvedValue();
			flowerRepository.deleteDescription.mockResolvedValue();
			flowerRepository.deleteDescendant.mockResolvedValue();
			flowerRepository.deleteFlower.mockResolvedValue();
			flowerRepository.findMutationsByOriginalOrId.mockResolvedValue([]);

			await FlowerStore.deleteLocalFlower(5);

			expect(flowerRepository.deleteFlower).toHaveBeenCalledWith(5);
			expect(flowerRepository.removeFavourite).toHaveBeenCalledWith(5);
			expect(announced).toEqual([['removed', 5]]);
			expect(toFavourites).toEqual([['removed', 5]]);
			expect(toLocalMutations).toEqual([['removed', 5]]);
			expect(toLocalDescendants).toEqual([['removed', 5]]);
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
			announced.length = 0;
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

	// FlowerStore does not keep the list of the local flowers: the view that shows it does, and these
	// are the words that reach it (src/services/listEvents.js)
	describe('what the list of the local flowers is told', () => {
		const realGenome = async () => {
			flowerRepository.addFlower.mockResolvedValueOnce(1);
			flowerRepository.getFlower.mockResolvedValueOnce({ id: 1, genome: 'g', image: 'i' });
			await FlowerStore.makeLocalFlower();
			const { genome } = flowerRepository.addFlower.mock.calls[0][0];
			vi.clearAllMocks();
			announced.length = 0;
			return genome;
		};

		test('makeLocalFlower says nothing when the flower could not be made', async () => {
			const fe = await getFlowerEvolver();
			vi.spyOn(fe, 'makeFlower').mockRejectedValueOnce(new Error('wasm trapped'));

			await FlowerStore.makeLocalFlower();

			expect(announced).toEqual([]);
			vi.restoreAllMocks();
		});

		test('redrawFlower announces the copy with the id it was stored with', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockResolvedValue(12);

			await FlowerStore.redrawFlower({ id: 3, genome, image: 'old' });

			expect(announced).toHaveLength(1);
			expect(announced[0][0]).toBe('added');
			expect(announced[0][1]).toMatchObject({ id: 12, genome });
		});

		test('redrawFlower announces nothing when the copy could not be stored: it is not in the table', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockRejectedValue(new Error('disk full'));

			await FlowerStore.redrawFlower({ id: 3, genome, image: 'old' });

			expect(announced).toEqual([]);
		});

		test('localReproduce announces the child, and to the descendants of the pair that was selected', async () => {
			const genome = await realGenome();
			FlowerStore.localSelected.flowers = [1, 2];
			flowerRepository.getFlower.mockImplementation(async (id) => ({ id, genome, image: 'i' }));
			flowerRepository.addFlower.mockResolvedValue(9);
			flowerRepository.addDescendant.mockResolvedValue();

			await FlowerStore.localReproduce();

			expect(announced).toEqual([['added', { id: 9, genome, image: 'i' }]]);
			// the first selected flower is the father and the second the mother, the lists of descendants decide with that
			expect(toLocalDescendants).toEqual([['added', { id: 9, genome, image: 'i' }, { father: 1, mother: 2 }]]);
		});

		test('makeLocalMutation announces the mutation, and to the mutations of the flower that was mutated', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockResolvedValue(10);
			flowerRepository.addMutation.mockResolvedValue();
			flowerRepository.getFlower.mockResolvedValue({ id: 10, genome, image: 'i' });

			await FlowerStore.makeLocalMutation({ id: 1, genome });

			expect(announced).toEqual([['added', { id: 10, genome, image: 'i' }]]);
			expect(flowerRepository.addMutation).toHaveBeenCalledWith({ id: 10, original: 1 });
			// the original is the one that was mutated, not the first of a family: a list decides with it if it is its own
			expect(toLocalMutations).toEqual([['added', { id: 10, genome, image: 'i' }, { original: 1 }]]);
		});

		test('makeLocalMutation announces nothing when the flower cannot be mutated', async () => {
			const fe = await getFlowerEvolver();
			vi.spyOn(fe, 'mutate').mockRejectedValueOnce(new Error('wasm trapped'));

			await FlowerStore.makeLocalMutation({ id: 1, genome: 'not a genome' });

			expect(announced).toEqual([]);
			expect(toLocalMutations).toEqual([]);
			expect(ErrorStore.push).toHaveBeenCalledWith("couldn't mutate a local flower.");
			vi.restoreAllMocks();
		});

		test('addRemoteFlowerToLocal announces the flower it brings in', async () => {
			const genome = await realGenome();
			vi.stubGlobal('fetch', vi.fn(async () => ({ text: async () => genome })));
			flowerRepository.addFlower.mockResolvedValue(11);

			await FlowerStore.addRemoteFlowerToLocal({ genome: 'remote-id' });

			await vi.waitFor(() => expect(announced).toHaveLength(1));
			expect(announced[0][1]).toMatchObject({ id: 11, genome });
			vi.unstubAllGlobals();
		});

		test('deleteLocalFlower announces the deletion once the flower is out of the table', async () => {
			const order = [];
			flowerRepository.removeFavourite.mockResolvedValue();
			flowerRepository.deleteDescription.mockResolvedValue();
			flowerRepository.deleteDescendant.mockResolvedValue();
			flowerRepository.deleteFlower.mockImplementation(async () => { order.push('deleted'); });
			flowerRepository.findMutationsByOriginalOrId.mockResolvedValue([]);
			stopListening();
			stopListening = listenToList('local', { removed: () => order.push('announced') });

			await FlowerStore.deleteLocalFlower(5);

			expect(order).toEqual(['deleted', 'announced']);
		});

		test('deleteAllFlowers announces a reset once the database is wiped', async () => {
			const order = [];
			flowerRepository.wipeDatabase.mockImplementation(async () => { order.push('wiped'); });
			stopListening();
			stopListening = listenToList('local', { reset: () => order.push('reset') });

			await FlowerStore.deleteAllFlowers();

			expect(order).toEqual(['wiped', 'reset']);
			// and so did the favourites, the mutations and the descendants
			expect(toFavourites).toEqual([['reset']]);
			expect(toLocalMutations).toEqual([['reset']]);
			expect(toLocalDescendants).toEqual([['reset']]);
		});

		test('deleteNonFavourites announces a reset, and only when the favourites are written again', async () => {
			flowerRepository.listFavouriteIds.mockResolvedValue([3]);
			flowerRepository.bulkGetFlowers.mockResolvedValue([{ id: 3, genome: 'g3', image: 'i3' }]);
			flowerRepository.bulkGetDescriptions.mockResolvedValue([undefined]);
			speciesRepository.bulkGetSpecies.mockResolvedValue([undefined]);
			const order = [];
			flowerRepository.bulkAddFlowers.mockImplementation(async () => { order.push('flowers written'); });
			speciesRepository.bulkPutSpecies.mockImplementation(async () => { order.push('species written'); });
			stopListening();
			stopListening = listenToList('local', {
				added: () => order.push('added'),
				reset: () => order.push('reset'),
			});

			await FlowerStore.deleteNonFavourites();

			// no flower is announced: a reset makes the view read the table, with the new ids
			expect(order).toEqual(['flowers written', 'species written', 'reset']);
			// the favourites were written again too, with the new ids, and the mutations and descendants are gone
			expect(toFavourites).toEqual([['reset']]);
			expect(toLocalMutations).toEqual([['reset']]);
			expect(toLocalDescendants).toEqual([['reset']]);
		});
	});

	// The parameters of the evolver and the rates of mutation are the settings of the user: they live in
	// SettingsStore and the actions that draw, reproduce and mutate read them when they are called
	describe('the settings that the evolver is given', () => {
		const params = { radius: 32, numLayers: 2, P: 4.5, bias: 0.5 };
		const rates = { addNodeRate: 0.11, addConnRate: 0.22, removeConnRate: 0.33, perturbWeightsRate: 0.44, enableRate: 0.55, disableRate: 0.66, actTypeRate: 0.77 };
		const realGenome = async () => {
			flowerRepository.addFlower.mockResolvedValueOnce(1);
			flowerRepository.getFlower.mockResolvedValueOnce({ id: 1, genome: 'g', image: 'i' });
			await FlowerStore.makeLocalFlower();
			const { genome } = flowerRepository.addFlower.mock.calls[0][0];
			vi.clearAllMocks();
			return genome;
		};
		const prepare = (genome) => {
			flowerRepository.addFlower.mockResolvedValue(5);
			flowerRepository.getFlower.mockImplementation(async (id) => ({ id, genome, image: 'i' }));
			flowerRepository.addMutation.mockResolvedValue();
			flowerRepository.addDescendant.mockResolvedValue();
		};

		afterEach(() => {
			vi.restoreAllMocks();
		});

		test.each([
			['makeLocalFlower', async () => FlowerStore.makeLocalFlower()],
			['redrawFlower', async (genome) => FlowerStore.redrawFlower({ id: 1, genome, image: 'i' })],
			['localReproduce', async () => {
				FlowerStore.localSelected.flowers = [1, 2];
				await FlowerStore.localReproduce();
			}],
			['makeLocalMutation', async (genome) => FlowerStore.makeLocalMutation({ id: 1, genome })],
			['addRemoteFlowerToLocal', async (genome) => {
				vi.stubGlobal('fetch', vi.fn(async () => ({ text: async () => genome })));
				await FlowerStore.addRemoteFlowerToLocal({ genome: 'remote-id' });
				vi.unstubAllGlobals();
			}],
		])('%s draws with the parameters of the settings', async (_, run) => {
			const genome = await realGenome();
			prepare(genome);
			SettingsStore.settings.params = { ...params };
			const setParams = vi.spyOn(await getFlowerEvolver(), 'setParams');

			await run(genome);
			// the flower of the server is fetched and drawn after the action returned
			await vi.waitFor(() => expect(setParams).toHaveBeenCalled());
			for(const [given] of setParams.mock.calls){
				expect(given).toMatchObject(params);
			}
			expect(ErrorStore.push).not.toHaveBeenCalled();
		});

		test('makeLocalMutation mutates with the rates of the settings, in the order the evolver takes them', async () => {
			const genome = await realGenome();
			prepare(genome);
			SettingsStore.settings.mutationRates = { ...rates };
			const mutate = vi.spyOn(await getFlowerEvolver(), 'mutate');

			await FlowerStore.makeLocalMutation({ id: 1, genome });

			expect(mutate).toHaveBeenCalledExactlyOnceWith(genome, 0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77);
		});

		test('what is used is what the settings say when the action is called, not when the store was made', async () => {
			const genome = await realGenome();
			prepare(genome);
			const setParams = vi.spyOn(await getFlowerEvolver(), 'setParams');

			SettingsStore.settings.params = { ...params };
			await FlowerStore.makeLocalFlower();
			// both ways that the settings change: one value, and the whole object (what the form of the parameters does)
			SettingsStore.settings.params.radius = 16;
			await FlowerStore.makeLocalFlower();
			SettingsStore.settings.params = { radius: 8, numLayers: 1, P: 2, bias: 0.25 };
			await FlowerStore.makeLocalFlower();

			expect(setParams.mock.calls.map(([given]) => [given.radius, given.numLayers, given.P, given.bias])).toEqual([
				[32, 2, 4.5, 0.5],
				[16, 2, 4.5, 0.5],
				[8, 1, 2, 0.25],
			]);
		});
	});

	describe('remote actions and error mapping', () => {
		test('shareFlower surfaces the offline message when the server is unreachable', async () => {
			flowerApiClient.shareFlower.mockRejectedValue({ response: undefined });

			await FlowerStore.shareFlower('genome-json');

			expect(flowerApiClient.mapAxiosError).toHaveBeenCalledWith({ response: undefined }, 'cannot share flower, server offline');
			expect(ErrorStore.push).toHaveBeenCalledWith('cannot share flower, server offline');
		});

		test('makeRemoteFlower announces the new flower to the remote flowers and to the last added', async () => {
			const flower = { id: 1, genome: 'g', image: 'i' };
			flowerApiClient.createFlower.mockResolvedValue(flower);

			await FlowerStore.makeRemoteFlower();

			expect(toRemote).toEqual([flower]);
			expect(toLastAdded).toEqual([flower]);
		});

		test('makeRemoteFlower announces nothing when the server cannot be reached', async () => {
			flowerApiClient.createFlower.mockRejectedValue({ response: undefined });

			await FlowerStore.makeRemoteFlower();

			expect(toRemote).toEqual([]);
			expect(toLastAdded).toEqual([]);
			expect(ErrorStore.push).toHaveBeenCalledWith('cannot make a remote flower, server offline');
		});

		test('makeRemoteMutation announces the mutation to the remote flowers and to the last added', async () => {
			const mutation = { id: 8, genome: 'g', image: 'i' };
			flowerApiClient.mutateRemote.mockResolvedValue(mutation);

			await FlowerStore.makeRemoteMutation({ id: 4 });

			expect(flowerApiClient.mutateRemote).toHaveBeenCalledWith(4);
			expect(toRemote).toEqual([mutation]);
			expect(toLastAdded).toEqual([mutation]);
			expect(toRemoteMutations).toEqual([[mutation, { original: 4 }]]);
		});

		test('remoteReproduce announces nothing when the server cannot be reached', async () => {
			FlowerStore.remoteSelected.flowers = [1, 2];
			flowerApiClient.reproduceRemote.mockRejectedValue({ response: undefined });

			await FlowerStore.remoteReproduce();

			expect(toRemote).toEqual([]);
			expect(toRemoteDescendants).toEqual([]);
			expect(ErrorStore.push).toHaveBeenCalledWith('cannot reproduce remote flowers, server offline.');
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
			expect(toRemote).toEqual([child]);
			expect(toLastAdded).toEqual([child]);
			expect(toRemoteDescendants).toEqual([[child, { father: 1, mother: 2 }]]);
		});
	});
});
