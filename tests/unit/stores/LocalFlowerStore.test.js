import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useLocalFlowerStore } from '../../../src/stores/LocalFlowerStore';
import { useSettingsStore } from '../../../src/stores/SettingsStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import * as flowerRepository from '../../../src/repositories/flowerRepository';
import * as speciesRepository from '../../../src/repositories/speciesRepository';
import { getFlowerEvolver } from '../../../src/services/flowerEvolver';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { listenToList } from '../../../src/services/listEvents';

// flowerRepository (Dexie) is exactly what's worth isolating here - IndexedDB.
vi.mock('../../../src/repositories/flowerRepository', () => ({
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

// The species of the flowers is the business of SpeciesStore, what matters here is when this store
// asks for it and what it carries across a wipe.
vi.mock('../../../src/repositories/speciesRepository', () => ({
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

describe('LocalFlowerStore', () => {
	let LocalFlowerStore;
	let SettingsStore;
	let ErrorStore;
	// what the views that show the list of the local flowers are told
	let announced;
	let stopListening;
	let toFavourites;
	// the lists of mutations: what they were told, with the relation that came with it
	let toLocalMutations;
	// the lists of descendants
	let toLocalDescendants;
	let stopOtherLists;

	beforeEach(() => {
		vi.clearAllMocks();
		announced = [];
		toFavourites = [];
		toLocalMutations = [];
		toLocalDescendants = [];
		stopOtherLists = [
			listenToList('localMutations', {
				added: (flower, relation) => toLocalMutations.push(['added', flower, relation]),
				removed: (id) => toLocalMutations.push(['removed', id]),
				reset: () => toLocalMutations.push(['reset']),
			}),
			listenToList('localDescendants', {
				added: (flower, relation) => toLocalDescendants.push(['added', flower, relation]),
				removed: (id) => toLocalDescendants.push(['removed', id]),
				reset: () => toLocalDescendants.push(['reset']),
			}),
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
		// stubActions: false - we want LocalFlowerStore's own actions to run for
		// real; only its collaborators (the two mocked services above) are faked.
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		LocalFlowerStore = useLocalFlowerStore();
		SettingsStore = useSettingsStore();
		ErrorStore = useErrorStore();
		vi.spyOn(ErrorStore, 'push');
	});

	afterEach(() => {
		stopListening();
		stopOtherLists.forEach((stop) => stop());
	});

	describe('local flower lifecycle (real wasm, mocked persistence)', () => {
		test('makeLocalFlower draws a real flower and stores it through the repository', async () => {
			flowerRepository.addFlower.mockResolvedValue(7);
			flowerRepository.getFlower.mockResolvedValue({ id: 7, genome: 'stored-genome', image: 'stored-image' });

			await LocalFlowerStore.makeLocalFlower();

			expect(flowerRepository.ensureOpen).toHaveBeenCalled();
			expect(flowerRepository.addFlower).toHaveBeenCalled();
			const [savedFlower] = flowerRepository.addFlower.mock.calls[0];
			expect(savedFlower.genome).toContain('"Flower"');
			expect(savedFlower.image).toMatch(/^data:image\/png;base64,/);
			expect(announced).toEqual([['added', { id: 7, genome: 'stored-genome', image: 'stored-image' }]]);
		});

		test('deleteLocalFlower removes the flower from every table via the repository', async () => {
			flowerRepository.removeFavourite.mockResolvedValue();
			flowerRepository.deleteDescription.mockResolvedValue();
			flowerRepository.deleteDescendant.mockResolvedValue();
			flowerRepository.deleteFlower.mockResolvedValue();
			flowerRepository.findMutationsByOriginalOrId.mockResolvedValue([]);

			await LocalFlowerStore.deleteLocalFlower(5);

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

			await LocalFlowerStore.deleteNonFavourites();

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

			const done = LocalFlowerStore.deleteNonFavourites();
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
			await LocalFlowerStore.makeLocalFlower();
			const { genome } = flowerRepository.addFlower.mock.calls[0][0];
			vi.clearAllMocks();
			announced.length = 0;
			return genome;
		};

		test('makeLocalFlower asks for the species of the flower it stored', async () => {
			flowerRepository.addFlower.mockResolvedValue(7);
			flowerRepository.getFlower.mockResolvedValue({ id: 7, genome: 'g', image: 'i' });

			await LocalFlowerStore.makeLocalFlower();

			expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(7);
		});

		test('does not ask for it when the flower could not be made', async () => {
			const fe = await getFlowerEvolver();
			vi.spyOn(fe, 'makeFlower').mockRejectedValueOnce(new Error('wasm trapped'));

			await LocalFlowerStore.makeLocalFlower();

			expect(speciesStore.classifyLater).not.toHaveBeenCalled();
			vi.restoreAllMocks();
		});

		test('redrawFlower asks for the species of the copy it stores, which has a new id', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockResolvedValue(12);

			await LocalFlowerStore.redrawFlower({ id: 3, genome, image: 'old' });

			expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(12);
		});

		test('redrawFlower does not ask when the copy could not be stored', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockRejectedValue(new Error('disk full'));

			await LocalFlowerStore.redrawFlower({ id: 3, genome, image: 'old' });

			expect(ErrorStore.push).toHaveBeenCalled();
			expect(speciesStore.classifyLater).not.toHaveBeenCalled();
		});

		test('localReproduce asks for the species of the child', async () => {
			const genome = await realGenome();
			LocalFlowerStore.localSelected.flowers = [1, 2];
			flowerRepository.getFlower.mockImplementation(async (id) => ({ id, genome, image: 'i' }));
			flowerRepository.addFlower.mockResolvedValue(9);
			flowerRepository.addDescendant.mockResolvedValue();

			await LocalFlowerStore.localReproduce();

			expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(9);
		});

		test('makeLocalMutation asks for the species of the mutation', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockResolvedValue(10);
			flowerRepository.addMutation.mockResolvedValue();
			flowerRepository.getFlower.mockResolvedValue({ id: 10, genome, image: 'i' });

			await LocalFlowerStore.makeLocalMutation({ id: 1, genome });

			expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(10);
		});

		test('addRemoteFlowerToLocal asks for the species of the flower it brings in', async () => {
			const genome = await realGenome();
			vi.stubGlobal('fetch', vi.fn(async () => ({ text: async () => genome })));
			flowerRepository.addFlower.mockResolvedValue(11);

			await LocalFlowerStore.addRemoteFlowerToLocal({ genome: 'remote-id' });

			await vi.waitFor(() => expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(11));
			vi.unstubAllGlobals();
		});

		test('deleteLocalFlower forgets the species of the flower', async () => {
			flowerRepository.removeFavourite.mockResolvedValue();
			flowerRepository.deleteDescription.mockResolvedValue();
			flowerRepository.deleteDescendant.mockResolvedValue();
			flowerRepository.deleteFlower.mockResolvedValue();
			flowerRepository.findMutationsByOriginalOrId.mockResolvedValue([]);

			await LocalFlowerStore.deleteLocalFlower(5);

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

			await LocalFlowerStore.deleteLocalFlower(5);

			expect(ErrorStore.push).toHaveBeenCalledWith(failure);
			expect(flowerRepository.deleteFlower).toHaveBeenCalledWith(5);
		});

		test('deleteAllFlowers forgets what was known by id once the database is wiped, the ids start again', async () => {
			await LocalFlowerStore.deleteAllFlowers();

			expect(speciesStore.invalidate).toHaveBeenCalledTimes(1);
			expect(flowerRepository.wipeDatabase.mock.invocationCallOrder[0])
				.toBeLessThan(speciesStore.invalidate.mock.invocationCallOrder[0]);
		});
	});

	// LocalFlowerStore does not keep the list of the local flowers: the view that shows it does, and these
	// are the words that reach it (src/services/listEvents.js)
	describe('what the list of the local flowers is told', () => {
		const realGenome = async () => {
			flowerRepository.addFlower.mockResolvedValueOnce(1);
			flowerRepository.getFlower.mockResolvedValueOnce({ id: 1, genome: 'g', image: 'i' });
			await LocalFlowerStore.makeLocalFlower();
			const { genome } = flowerRepository.addFlower.mock.calls[0][0];
			vi.clearAllMocks();
			announced.length = 0;
			return genome;
		};

		test('makeLocalFlower says nothing when the flower could not be made', async () => {
			const fe = await getFlowerEvolver();
			vi.spyOn(fe, 'makeFlower').mockRejectedValueOnce(new Error('wasm trapped'));

			await LocalFlowerStore.makeLocalFlower();

			expect(announced).toEqual([]);
			vi.restoreAllMocks();
		});

		test('redrawFlower announces the copy with the id it was stored with', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockResolvedValue(12);

			await LocalFlowerStore.redrawFlower({ id: 3, genome, image: 'old' });

			expect(announced).toHaveLength(1);
			expect(announced[0][0]).toBe('added');
			expect(announced[0][1]).toMatchObject({ id: 12, genome });
		});

		test('redrawFlower announces nothing when the copy could not be stored: it is not in the table', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockRejectedValue(new Error('disk full'));

			await LocalFlowerStore.redrawFlower({ id: 3, genome, image: 'old' });

			expect(announced).toEqual([]);
		});

		test('localReproduce announces the child, and to the descendants of the pair that was selected', async () => {
			const genome = await realGenome();
			LocalFlowerStore.localSelected.flowers = [1, 2];
			flowerRepository.getFlower.mockImplementation(async (id) => ({ id, genome, image: 'i' }));
			flowerRepository.addFlower.mockResolvedValue(9);
			flowerRepository.addDescendant.mockResolvedValue();

			await LocalFlowerStore.localReproduce();

			expect(announced).toEqual([['added', { id: 9, genome, image: 'i' }]]);
			// the first selected flower is the father and the second the mother, the lists of descendants decide with that
			expect(toLocalDescendants).toEqual([['added', { id: 9, genome, image: 'i' }, { father: 1, mother: 2 }]]);
		});

		test('makeLocalMutation announces the mutation, and to the mutations of the flower that was mutated', async () => {
			const genome = await realGenome();
			flowerRepository.addFlower.mockResolvedValue(10);
			flowerRepository.addMutation.mockResolvedValue();
			flowerRepository.getFlower.mockResolvedValue({ id: 10, genome, image: 'i' });

			await LocalFlowerStore.makeLocalMutation({ id: 1, genome });

			expect(announced).toEqual([['added', { id: 10, genome, image: 'i' }]]);
			expect(flowerRepository.addMutation).toHaveBeenCalledWith({ id: 10, original: 1 });
			// the original is the one that was mutated, not the first of a family: a list decides with it if it is its own
			expect(toLocalMutations).toEqual([['added', { id: 10, genome, image: 'i' }, { original: 1 }]]);
		});

		test('makeLocalMutation announces nothing when the flower cannot be mutated', async () => {
			const fe = await getFlowerEvolver();
			vi.spyOn(fe, 'mutate').mockRejectedValueOnce(new Error('wasm trapped'));

			await LocalFlowerStore.makeLocalMutation({ id: 1, genome: 'not a genome' });

			expect(announced).toEqual([]);
			expect(toLocalMutations).toEqual([]);
			expect(ErrorStore.push).toHaveBeenCalledWith("couldn't mutate a local flower.");
			vi.restoreAllMocks();
		});

		test('addRemoteFlowerToLocal announces the flower it brings in', async () => {
			const genome = await realGenome();
			vi.stubGlobal('fetch', vi.fn(async () => ({ text: async () => genome })));
			flowerRepository.addFlower.mockResolvedValue(11);

			await LocalFlowerStore.addRemoteFlowerToLocal({ genome: 'remote-id' });

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

			await LocalFlowerStore.deleteLocalFlower(5);

			expect(order).toEqual(['deleted', 'announced']);
		});

		test('deleteAllFlowers announces a reset once the database is wiped', async () => {
			const order = [];
			flowerRepository.wipeDatabase.mockImplementation(async () => { order.push('wiped'); });
			stopListening();
			stopListening = listenToList('local', { reset: () => order.push('reset') });

			await LocalFlowerStore.deleteAllFlowers();

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

			await LocalFlowerStore.deleteNonFavourites();

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
			await LocalFlowerStore.makeLocalFlower();
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
			['makeLocalFlower', async () => LocalFlowerStore.makeLocalFlower()],
			['redrawFlower', async (genome) => LocalFlowerStore.redrawFlower({ id: 1, genome, image: 'i' })],
			['localReproduce', async () => {
				LocalFlowerStore.localSelected.flowers = [1, 2];
				await LocalFlowerStore.localReproduce();
			}],
			['makeLocalMutation', async (genome) => LocalFlowerStore.makeLocalMutation({ id: 1, genome })],
			['addRemoteFlowerToLocal', async (genome) => {
				vi.stubGlobal('fetch', vi.fn(async () => ({ text: async () => genome })));
				await LocalFlowerStore.addRemoteFlowerToLocal({ genome: 'remote-id' });
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

			await LocalFlowerStore.makeLocalMutation({ id: 1, genome });

			expect(mutate).toHaveBeenCalledExactlyOnceWith(genome, 0.11, 0.22, 0.33, 0.44, 0.55, 0.66, 0.77);
		});

		test('what is used is what the settings say when the action is called, not when the store was made', async () => {
			const genome = await realGenome();
			prepare(genome);
			const setParams = vi.spyOn(await getFlowerEvolver(), 'setParams');

			SettingsStore.settings.params = { ...params };
			await LocalFlowerStore.makeLocalFlower();
			// both ways that the settings change: one value, and the whole object (what the form of the parameters does)
			SettingsStore.settings.params.radius = 16;
			await LocalFlowerStore.makeLocalFlower();
			SettingsStore.settings.params = { radius: 8, numLayers: 1, P: 2, bias: 0.25 };
			await LocalFlowerStore.makeLocalFlower();

			expect(setParams.mock.calls.map(([given]) => [given.radius, given.numLayers, given.P, given.bias])).toEqual([
				[32, 2, 4.5, 0.5],
				[16, 2, 4.5, 0.5],
				[8, 1, 2, 0.25],
			]);
		});
	});

	describe('a flower drawn with other params (real wasm, mocked persistence)', () => {
		const BEFORE = { radius: 64, numLayers: 3, P: 6, bias: 1 };
		const pixels = (image) => {
			const bytes = Buffer.from(image.replace(/^data:image\/png;base64,/, ''), 'base64');
			return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
		};
		const petalsOf = (genome) => JSON.parse(genome).Flower.petals;
		const dnaOf = (genome) => JSON.stringify(JSON.parse(genome).Flower.dna);
		let genome;
		let fe;

		beforeEach(async () => {
			fe = await getFlowerEvolver();
			fe.setParams(new FEParams(BEFORE.radius, BEFORE.numLayers, BEFORE.P, BEFORE.bias));
			genome = (await fe.makeFlower()).genome;
			vi.clearAllMocks();
			flowerRepository.addFlower.mockResolvedValue(9);
		});

		describe('drawFlowerWithParams', () => {
			test('is the genome with the params in its petals, and the dna that it had', async () => {
				const drawn = await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 32, numLayers: 2, P: 4.5, bias: 0.5 });

				expect(petalsOf(drawn.genome)).toEqual({ radius: 32, numLayers: 2, P: 4.5, bias: 0.5 });
				expect(dnaOf(drawn.genome)).toBe(dnaOf(genome));
				expect(drawn.params).toEqual({ radius: 32, numLayers: 2, P: 4.5, bias: 0.5 });
			});

			test('is drawn with them: the size of the image is the one of the radius', async () => {
				const small = await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 32, numLayers: 2, P: 6, bias: 1 });
				const big = await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 128, numLayers: 3, P: 6, bias: 1 });

				expect(small.image).toMatch(/^data:image\/png;base64,/);
				expect(pixels(small.image)).toEqual([64, 96]);
				expect(pixels(big.image)).toEqual([256, 384]);
			});

			test('is drawn with them and not with the ones of the settings', async () => {
				SettingsStore.settings.params = { radius: 16, numLayers: 2, P: 1, bias: 1 };

				const drawn = await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 128, numLayers: 3, P: 6, bias: 1 });

				expect(pixels(drawn.image)).toEqual([256, 384]);
			});

			test('keeps the params that the wasm kept: it limits them, and says so, so the genome does not have what was not drawn', async () => {
				const drawn = await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 1, numLayers: 20, P: 6, bias: 1 });
				const asked = await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 4, numLayers: 2, P: 6, bias: 1 });

				expect(drawn.params).toEqual({ radius: 4, numLayers: 2, P: 6, bias: 1 });
				expect(petalsOf(drawn.genome)).toEqual(drawn.params);
				// The size is what says that a radius of 4 was drawn. Two images of the same genome are not compared: the wasm does not
				// draw the same one twice (about one genome in six comes out different), so that would fail one run in five.
				expect(pixels(drawn.image)).toEqual([8, 12]);
				expect(pixels(asked.image)).toEqual([8, 12]);
				expect(asked.params).toEqual(drawn.params);
				expect(petalsOf(asked.genome)).toEqual(petalsOf(drawn.genome));
			});

			test.each([
				[{ radius: 512, numLayers: 3, P: 6, bias: 1 }, { radius: 256, numLayers: 3, P: 6, bias: 1 }],
				[{ radius: 64, numLayers: 0, P: 6, bias: 1 }, { radius: 64, numLayers: 1, P: 6, bias: 1 }],
				[{ radius: 64, numLayers: 20, P: 6, bias: 1 }, { radius: 64, numLayers: 6, P: 6, bias: 1 }],
				[{ radius: 64, numLayers: 2.7, P: 6, bias: 1 }, { radius: 64, numLayers: 2, P: 6, bias: 1 }],
			])('has %j as %j, which is what the wasm says', async (given, kept) => {
				const drawn = await LocalFlowerStore.drawFlowerWithParams(genome, given);

				expect(drawn.params).toEqual(kept);
			});

			test('stores nothing, announces nothing and does not ask for a species', async () => {
				await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 32, numLayers: 2, P: 6, bias: 1 });

				expect(flowerRepository.addFlower).not.toHaveBeenCalled();
				expect(announced).toEqual([]);
				expect(speciesStore.classifyLater).not.toHaveBeenCalled();
			});

			test('does not touch the settings', async () => {
				const before = JSON.stringify(SettingsStore.settings);

				await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 32, numLayers: 2, P: 4.5, bias: 0.5 });

				expect(JSON.stringify(SettingsStore.settings)).toBe(before);
			});

			test('leaves the evolver with the params that it had', async () => {
				const had = fe.getParams();

				await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 32, numLayers: 2, P: 4.5, bias: 0.5 });

				expect(fe.getParams()).toBe(had);
				expect(fe.getParams()).toMatchObject(BEFORE);
			});

			test('leaves the evolver with the params that it had when it cannot draw, and says why', async () => {
				const had = fe.getParams();

				await expect(LocalFlowerStore.drawFlowerWithParams('not a genome', { radius: 32, numLayers: 2, P: 4.5, bias: 0.5 })).rejects.toThrow();

				expect(fe.getParams()).toBe(had);
			});

			test('does not change the genome that it is given', async () => {
				const copy = genome;

				await LocalFlowerStore.drawFlowerWithParams(genome, { radius: 32, numLayers: 2, P: 4.5, bias: 0.5 });

				expect(genome).toBe(copy);
				expect(petalsOf(genome)).toEqual(BEFORE);
			});
		});

		describe('addFlowerWithParams', () => {
			const PARAMS = { radius: 32, numLayers: 2, P: 4.5, bias: 0.5 };

			test('stores a new flower with the params in its genome, drawn with them', async () => {
				const flower = await LocalFlowerStore.addFlowerWithParams(genome, PARAMS);

				expect(flowerRepository.ensureOpen).toHaveBeenCalled();
				expect(flowerRepository.addFlower).toHaveBeenCalledTimes(1);
				const [stored] = flowerRepository.addFlower.mock.calls[0];
				expect(petalsOf(stored.genome)).toEqual(PARAMS);
				expect(dnaOf(stored.genome)).toBe(dnaOf(genome));
				expect(pixels(stored.image)).toEqual([64, 96]);
				expect(flower).toMatchObject({ id: 9, genome: stored.genome, image: stored.image });
			});

			test('announces the flower to the list of the browser, with its id, and asks for its species', async () => {
				const flower = await LocalFlowerStore.addFlowerWithParams(genome, PARAMS);

				expect(announced).toEqual([['added', flower]]);
				expect(flower.id).toBe(9);
				expect(speciesStore.classifyLater).toHaveBeenCalledExactlyOnceWith(9);
			});

			test('is not a descendant nor a mutation of the flower that it comes from', async () => {
				await LocalFlowerStore.addFlowerWithParams(genome, PARAMS);

				expect(toLocalMutations).toEqual([]);
				expect(toLocalDescendants).toEqual([]);
				expect(flowerRepository.addMutation).not.toHaveBeenCalled();
				expect(flowerRepository.addDescendant).not.toHaveBeenCalled();
			});

			test('has the params that the wasm kept', async () => {
				await LocalFlowerStore.addFlowerWithParams(genome, { radius: 1, numLayers: 20, P: 6, bias: 1 });

				const [stored] = flowerRepository.addFlower.mock.calls[0];
				expect(petalsOf(stored.genome)).toEqual({ radius: 4, numLayers: 2, P: 6, bias: 1 });
			});

			test('does not touch the settings, and leaves the evolver with the params that it had', async () => {
				const had = fe.getParams();
				const before = JSON.stringify(SettingsStore.settings);

				await LocalFlowerStore.addFlowerWithParams(genome, PARAMS);

				expect(JSON.stringify(SettingsStore.settings)).toBe(before);
				expect(fe.getParams()).toBe(had);
			});

			test('says that it could not draw, and stores nothing, when the genome is not one', async () => {
				const flower = await LocalFlowerStore.addFlowerWithParams('not a genome', PARAMS);

				expect(flower).toBeUndefined();
				expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith("couldn't draw the flower with those params.");
				expect(flowerRepository.addFlower).not.toHaveBeenCalled();
				expect(announced).toEqual([]);
				expect(speciesStore.classifyLater).not.toHaveBeenCalled();
			});

			test('leaves the evolver with the params that it had when it could not draw', async () => {
				const had = fe.getParams();

				await LocalFlowerStore.addFlowerWithParams('not a genome', PARAMS);

				expect(fe.getParams()).toBe(had);
			});

			test('says why when the flower cannot be stored, and does not announce what is not in the table', async () => {
				const failure = new Error('quota exceeded');
				flowerRepository.addFlower.mockRejectedValue(failure);

				const flower = await LocalFlowerStore.addFlowerWithParams(genome, PARAMS);

				expect(flower).toBeUndefined();
				expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith(failure);
				expect(announced).toEqual([]);
				expect(speciesStore.classifyLater).not.toHaveBeenCalled();
			});

			test('says why when the table cannot be opened', async () => {
				const failure = new Error('blocked');
				flowerRepository.ensureOpen.mockImplementation(() => { throw failure; });

				const flower = await LocalFlowerStore.addFlowerWithParams(genome, PARAMS);

				expect(flower).toBeUndefined();
				expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith(failure);
				expect(flowerRepository.addFlower).not.toHaveBeenCalled();
			});
		});
	});
});
