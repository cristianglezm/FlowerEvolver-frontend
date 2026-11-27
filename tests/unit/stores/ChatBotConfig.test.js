import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { execCommand, initRouter, tools, documents } from '../../../src/stores/ChatBotConfig';
import { useFavouritesStore } from '../../../src/stores/FavouritesStore';
import * as flowerRepository from '../../../src/repositories/flowerRepository';

// Only the commands that call the stores of the application are tested here: the two of the favourites, the two
// that read a flower (`describe`, `mutate`), which go through the repository, and the ones that act on the local
// flowers. The stores have only what those commands use, a command that still asked for more would fail.
const { localFlowerStore, captionerStore, speciesStore, errorStore, router } = vi.hoisted(() => ({
	localFlowerStore: {}, captionerStore: {}, speciesStore: {}, errorStore: {}, router: {},
}));
vi.mock('vue-router', () => ({ useRouter: () => router }));
vi.mock('../../../src/stores/SpeciesStore', () => ({ useSpeciesStore: () => speciesStore }));
vi.mock('../../../src/stores/ErrorStore', () => ({ useErrorStore: () => errorStore }));
vi.mock('../../../src/stores/LocalFlowerStore', () => ({ useLocalFlowerStore: () => localFlowerStore }));
vi.mock('../../../src/stores/CaptionerStore', () => ({ useCaptionerStore: () => captionerStore }));
vi.mock('../../../src/repositories/flowerRepository', () => ({ getFlower: vi.fn() }));
vi.mock('../../../src/stores/vectorStore', () => ({ useVectorStore: () => ({}) }));

const call = (name, parameters) => `<tool_call>${JSON.stringify([{ name, parameters }])}</tool_call>`;

describe('the commands of the chatbot for the favourites', () => {
	let FavouritesStore;

	beforeEach(() => {
		createTestingPinia({ stubActions: true, createSpy: vi.fn });
		FavouritesStore = useFavouritesStore();
	});

	describe('addToFav', () => {
		test('makes the flower a favourite', () => {
			const result = execCommand(call('addToFav', { id: 7 }));

			expect(FavouritesStore.addFlowerToFav).toHaveBeenCalledExactlyOnceWith(7);
			expect(result.infoForUser).toEqual(['addToFavs command executed']);
			expect(result.commandsToConfirm).toEqual([]);
		});

		test('says so when it is not told which flower', () => {
			const result = execCommand(call('addToFav', {}));

			expect(FavouritesStore.addFlowerToFav).not.toHaveBeenCalled();
			expect(result.infoForUser).toEqual(['Flower id not found', 'addToFavs command failed']);
		});
	});

	describe('deleteFromFav', () => {
		test('asks first, and takes the flower out of the favourites only when it is confirmed', async () => {
			const result = execCommand(call('deleteFromFav', { id: 7 }));

			expect(result.infoForUser).toEqual(['deleteFromFav requested confirmation']);
			expect(result.commandsToConfirm).toHaveLength(1);
			expect(result.commandsToConfirm[0]).toMatchObject({
				title: 'remove flower with id 7 from favourites',
				btnNo: 'no',
				btnYes: 'remove flower from favourites',
			});
			expect(FavouritesStore.removeFlowerFromFav).not.toHaveBeenCalled();

			await result.commandsToConfirm[0].onConfirm();

			expect(FavouritesStore.removeFlowerFromFav).toHaveBeenCalledExactlyOnceWith(7);
		});

		test('says so when it is not told which flower, and asks nothing', () => {
			const result = execCommand(call('deleteFromFav', {}));

			expect(result.infoForUser).toEqual(['deleteFromFav: id not given', 'deleteFromFav command failed']);
			expect(result.commandsToConfirm).toEqual([]);
			expect(FavouritesStore.removeFlowerFromFav).not.toHaveBeenCalled();
		});
	});
});

describe('the commands of the chatbot that read a flower', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: true, createSpy: vi.fn });
		flowerRepository.getFlower.mockReset();
		localFlowerStore.makeLocalMutation = vi.fn();
		captionerStore.loadAndConcatLocalDescriptions = vi.fn(() => new Promise(() => {}));
	});

	describe('mutate', () => {
		test('mutates the flower that the repository has', async () => {
			const flower = { id: 7, genome: 'g', image: 'i' };
			flowerRepository.getFlower.mockResolvedValue(flower);

			const result = execCommand(call('mutate', { id: 7 }));
			await vi.waitFor(() => expect(localFlowerStore.makeLocalMutation).toHaveBeenCalledExactlyOnceWith(flower));

			expect(flowerRepository.getFlower).toHaveBeenCalledExactlyOnceWith(7);
			expect(result.infoForUser).toEqual(['mutate command executed.']);
		});

		test('says so when the flower is not there', async () => {
			flowerRepository.getFlower.mockRejectedValue(new Error('not found'));

			const result = execCommand(call('mutate', { id: 7 }));
			await vi.waitFor(() => expect(result.infoForUser).toContain('mutate command not executed, Flower not found'));

			expect(localFlowerStore.makeLocalMutation).not.toHaveBeenCalled();
		});

		test('says so when it is not told which flower, and does not look for one', () => {
			const result = execCommand(call('mutate', {}));

			expect(result.infoForUser).toEqual(['mutate: flower id not given', 'mutate command failed.']);
			expect(flowerRepository.getFlower).not.toHaveBeenCalled();
		});
	});

	describe('describe', () => {
		test('looks the flower up in the repository and preloads the descriptions around it', async () => {
			flowerRepository.getFlower.mockResolvedValue({ id: 20, genome: 'g', image: 'i' });

			execCommand(call('describe', { id: 20 }));
			// 5 before the flower, 10 in all
			await vi.waitFor(() => expect(captionerStore.loadAndConcatLocalDescriptions).toHaveBeenCalledExactlyOnceWith(15, 10));

			expect(flowerRepository.getFlower).toHaveBeenCalledExactlyOnceWith(20);
		});

		test('says so when the flower is not there', async () => {
			flowerRepository.getFlower.mockRejectedValue(new Error('not found'));

			const result = execCommand(call('describe', { id: 20 }));
			await vi.waitFor(() => expect(result.infoForUser)
				.toEqual(["I am sorry I couldn't describe the flower because it was not found"]));

			expect(captionerStore.loadAndConcatLocalDescriptions).not.toHaveBeenCalled();
		});
	});
});

describe('the commands of the chatbot that act on the local flowers', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: true, createSpy: vi.fn });
		['makeLocalFlower', 'selectLocalFlower', 'localReproduce', 'deleteLocalFlower', 'deleteAllFlowers', 'deleteNonFavourites']
			.forEach((name) => { localFlowerStore[name] = vi.fn(); });
	});

	describe('makeFlower', () => {
		test('makes a local flower', () => {
			const result = execCommand(call('makeFlower', {}));

			expect(localFlowerStore.makeLocalFlower).toHaveBeenCalledTimes(1);
			expect(result.infoForUser).toEqual(['makeFlower command executed']);
			expect(result.commandsToConfirm).toEqual([]);
		});
	});

	describe('reproduce', () => {
		test('selects the father and then the mother, and reproduces them', () => {
			const result = execCommand(call('reproduce', { father: 3, mother: 4 }));

			expect(localFlowerStore.selectLocalFlower.mock.calls).toEqual([[{ id: 3 }], [{ id: 4 }]]);
			expect(localFlowerStore.localReproduce).toHaveBeenCalledTimes(1);
			// the pair has to be selected before the reproduction reads it
			expect(Math.max(...localFlowerStore.selectLocalFlower.mock.invocationCallOrder))
				.toBeLessThan(localFlowerStore.localReproduce.mock.invocationCallOrder[0]);
			expect(result.infoForUser).toEqual(['reproduce command executed']);
		});

		test.each([
			['the mother', { father: 3 }],
			['the father', { mother: 4 }],
			['both', {}],
		])('says so when it is not told %s, and selects and reproduces nothing', (_, parameters) => {
			const result = execCommand(call('reproduce', parameters));

			expect(localFlowerStore.selectLocalFlower).not.toHaveBeenCalled();
			expect(localFlowerStore.localReproduce).not.toHaveBeenCalled();
			expect(result.infoForUser).toEqual(['reproduce: father or mother id not given, need both ids.', 'reproduce command failed']);
		});
	});

	describe('deleteFlower', () => {
		test('asks first, and deletes the flower only when it is confirmed', async () => {
			const result = execCommand(call('deleteFlower', { id: 9 }));

			expect(result.infoForUser).toEqual(['deleteFlower requested confirmation']);
			expect(result.commandsToConfirm).toHaveLength(1);
			expect(result.commandsToConfirm[0]).toMatchObject({
				title: 'delete flower with id 9',
				btnNo: 'no',
				btnYes: 'Delete flower',
			});
			expect(localFlowerStore.deleteLocalFlower).not.toHaveBeenCalled();

			await result.commandsToConfirm[0].onConfirm();

			expect(localFlowerStore.deleteLocalFlower).toHaveBeenCalledExactlyOnceWith(9);
			// only that flower
			expect(localFlowerStore.deleteAllFlowers).not.toHaveBeenCalled();
			expect(localFlowerStore.deleteNonFavourites).not.toHaveBeenCalled();
		});

		test('says so when it is not told which flower, and asks nothing', () => {
			const result = execCommand(call('deleteFlower', {}));

			expect(result.infoForUser).toEqual(['deleteFlower: id not given', 'deleteFlower command failed']);
			expect(result.commandsToConfirm).toEqual([]);
			expect(localFlowerStore.deleteLocalFlower).not.toHaveBeenCalled();
		});
	});

	describe.each([
		['deleteAllFlowers', 'deleteAllFlowers', 'delete all flowers', 'Delete all'],
		['deleteNonFavourites', 'deleteNonFavourites', 'Delete non favourites', 'Delete non favourites'],
	])('%s', (command, action, title, btnYes) => {
		test('asks first, and deletes only when it is confirmed', async () => {
			const result = execCommand(call(command, {}));

			expect(result.infoForUser).toEqual([`${command} requested confirmation`]);
			expect(result.commandsToConfirm).toHaveLength(1);
			expect(result.commandsToConfirm[0]).toMatchObject({ title, btnNo: 'no', btnYes });
			expect(localFlowerStore[action]).not.toHaveBeenCalled();

			await result.commandsToConfirm[0].onConfirm();

			expect(localFlowerStore[action]).toHaveBeenCalledTimes(1);
			// the other one of the two is not touched
			const other = action === 'deleteAllFlowers' ? 'deleteNonFavourites' : 'deleteAllFlowers';
			expect(localFlowerStore[other]).not.toHaveBeenCalled();
		});
	});
});

describe('the commands of the chatbot for the species', () => {
	beforeEach(() => {
		initRouter();
		router.push = vi.fn();
		errorStore.push = vi.fn();
		for(const key of Object.keys(speciesStore)){
			delete speciesStore[key];
		}
		Object.assign(speciesStore, {
			model: { width: 6, height: 6 },
			hasTuned: true,
			isTuning: false,
			status: 'idle',
			select: vi.fn(),
			selectSub: vi.fn(),
			submapOf: vi.fn(() => undefined),
			nameOf: vi.fn((x, y) => `Species ${x}-${y}`),
			unsplit: vi.fn().mockResolvedValue('done'),
			resetClassifier: vi.fn().mockResolvedValue('done'),
		});
	});

	describe('the tools that the model is told about', () => {
		test('goto can go to the Species tab, and goes to it by name', () => {
			const goto = tools.find((tool) => tool.name === 'goto');
			expect(goto.parameters.path.enum).toContain('Species');

			const result = execCommand(call('goto', { path: 'Species' }));

			expect(router.push).toHaveBeenCalledExactlyOnceWith({ name: 'Species' });
			expect(result.infoForUser).toEqual(['goto command executed']);
		});

		test('each command that is new is a tool with its parameters, and the tool names are not repeated', () => {
			const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
			expect(Object.keys(byName['selectSpecies'].parameters)).toEqual(['x', 'y', 'sub']);
			expect(Object.keys(byName['unsplitSpecies'].parameters)).toEqual(['x', 'y']);
			expect(byName['resetClassifier'].parameters).toEqual({});
			expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
		});

		test('the documents say what the species are and how to use the tab, and the titles are not repeated', () => {
			const titles = documents.map((doc) => doc.title);
			expect(new Set(titles).size).toBe(titles.length);
			const text = documents.map((doc) => doc.title + ' ' + doc.content).join(' ');
			for(const word of ["'Species' tab", 'Fine-tune', 'Use as parent', 'Split', 'Remove the split', 'Use the built-in classifier']){
				expect(text, word).toContain(word);
			}
		});
	});

	describe('selectSpecies', () => {
		test('selects the species and goes to the Species tab', () => {
			const result = execCommand(call('selectSpecies', { x: 2, y: 3 }));

			expect(speciesStore.select).toHaveBeenCalledExactlyOnceWith({ x: 2, y: 3 });
			expect(speciesStore.selectSub).not.toHaveBeenCalled();
			expect(router.push).toHaveBeenCalledExactlyOnceWith({ name: 'Species' });
			expect(result.infoForUser).toEqual(['selectSpecies command executed']);
		});

		test('takes 0 as a cell, and the cell as a whole number written in text', () => {
			execCommand(call('selectSpecies', { x: 0, y: '5' }));

			expect(speciesStore.select).toHaveBeenCalledExactlyOnceWith({ x: 0, y: 5 });
		});

		test('selects a sub-species of a species that is split', () => {
			speciesStore.submapOf.mockReturnValue({ subfp: 'f', w: 3, h: 2, flowers: 9 });

			const result = execCommand(call('selectSpecies', { x: 1, y: 1, sub: { x: 2, y: 1 } }));

			expect(speciesStore.select).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 1 });
			expect(speciesStore.selectSub).toHaveBeenCalledExactlyOnceWith({ x: 2, y: 1 });
			expect(router.push).toHaveBeenCalledExactlyOnceWith({ name: 'Species' });
			expect(result.infoForUser).toEqual(['selectSpecies command executed']);
		});

		test.each([
			['no cell', {}],
			['no y', { x: 1 }],
			['a fraction', { x: 1.5, y: 1 }],
			['a negative', { x: -1, y: 1 }],
			['text that is not a number', { x: 'a', y: 1 }],
			['an empty text', { x: '', y: 1 }],
			['a boolean', { x: true, y: 1 }],
		])('says so and does nothing with %s', (_, parameters) => {
			const result = execCommand(call('selectSpecies', parameters));

			expect(speciesStore.select).not.toHaveBeenCalled();
			expect(router.push).not.toHaveBeenCalled();
			expect(result.infoForUser).toHaveLength(2);
			expect(result.infoForUser[1]).toBe('selectSpecies command failed');
		});

		test('says that a species outside the map is not there', () => {
			const result = execCommand(call('selectSpecies', { x: 6, y: 0 }));

			expect(speciesStore.select).not.toHaveBeenCalled();
			expect(result.infoForUser).toEqual(['selectSpecies: there is no species at (6, 0)', 'selectSpecies command failed']);
		});

		test('does not know the size of the map before the classifier starts, and trusts the cell', () => {
			speciesStore.model = null;

			execCommand(call('selectSpecies', { x: 40, y: 0 }));

			expect(speciesStore.select).toHaveBeenCalledExactlyOnceWith({ x: 40, y: 0 });
		});

		test('says that a species that is not split has no sub-species', () => {
			const result = execCommand(call('selectSpecies', { x: 1, y: 1, sub: { x: 0, y: 0 } }));

			expect(speciesStore.select).not.toHaveBeenCalled();
			expect(router.push).not.toHaveBeenCalled();
			expect(result.infoForUser).toEqual(['selectSpecies: the species at (1, 1) has no sub-species', 'selectSpecies command failed']);
		});

		test('says that a sub-species outside the split is not there', () => {
			speciesStore.submapOf.mockReturnValue({ subfp: 'f', w: 3, h: 2, flowers: 9 });

			const result = execCommand(call('selectSpecies', { x: 1, y: 1, sub: { x: 3, y: 0 } }));

			expect(speciesStore.select).not.toHaveBeenCalled();
			expect(result.infoForUser).toEqual(['selectSpecies: there is no sub-species at (3, 0)', 'selectSpecies command failed']);
		});

		test('says that a sub-species needs both of its numbers', () => {
			speciesStore.submapOf.mockReturnValue({ subfp: 'f', w: 3, h: 2, flowers: 9 });

			const result = execCommand(call('selectSpecies', { x: 1, y: 1, sub: { x: 1 } }));

			expect(speciesStore.select).not.toHaveBeenCalled();
			expect(result.infoForUser).toEqual(['selectSpecies: sub needs x and y', 'selectSpecies command failed']);
		});
	});

	describe('unsplitSpecies', () => {
		test('asks first, and takes the sub-species away only when it is confirmed', async () => {
			speciesStore.submapOf.mockReturnValue({ subfp: 'f', w: 2, h: 2, flowers: 9 });

			const result = execCommand(call('unsplitSpecies', { x: 2, y: 3 }));

			expect(result.infoForUser).toEqual(['unsplitSpecies requested confirmation']);
			expect(result.commandsToConfirm).toHaveLength(1);
			expect(result.commandsToConfirm[0]).toMatchObject({
				title: 'remove the sub-species',
				message: 'Remove the sub-species of Species 2-3? The flowers stay in the species.',
				btnNo: 'no',
				btnYes: 'Remove them',
			});
			expect(speciesStore.unsplit).not.toHaveBeenCalled();

			await result.commandsToConfirm[0].onConfirm();

			expect(speciesStore.unsplit).toHaveBeenCalledExactlyOnceWith({ x: 2, y: 3 });
			expect(errorStore.push).not.toHaveBeenCalled();
		});

		test('tells the user when the flowers are still being classified', async () => {
			speciesStore.submapOf.mockReturnValue({ subfp: 'f', w: 2, h: 2, flowers: 9 });
			speciesStore.unsplit.mockResolvedValue('busy');

			const result = execCommand(call('unsplitSpecies', { x: 2, y: 3 }));
			await result.commandsToConfirm[0].onConfirm();

			expect(errorStore.push).toHaveBeenCalledOnce();
			expect(errorStore.push.mock.calls[0][0].message).toBe('Your flowers are still being classified, try again in a moment.');
		});

		test('says that a species that is not split has nothing to remove, and does not ask', () => {
			const result = execCommand(call('unsplitSpecies', { x: 2, y: 3 }));

			expect(result.commandsToConfirm).toEqual([]);
			expect(result.infoForUser).toEqual(['unsplitSpecies: the species at (2, 3) is not split', 'unsplitSpecies command failed']);
		});

		test('says so when the cell is not given or is not in the map, and does not ask', () => {
			let result = execCommand(call('unsplitSpecies', { x: 2 }));
			expect(result.commandsToConfirm).toEqual([]);
			expect(result.infoForUser[1]).toBe('unsplitSpecies command failed');

			result = execCommand(call('unsplitSpecies', { x: 9, y: 9 }));
			expect(result.commandsToConfirm).toEqual([]);
			expect(result.infoForUser).toEqual(['unsplitSpecies: there is no species at (9, 9)', 'unsplitSpecies command failed']);
		});
	});

	describe('resetClassifier', () => {
		test('asks first, and goes back to the built-in classifier only when it is confirmed', async () => {
			const result = execCommand(call('resetClassifier', {}));

			expect(result.infoForUser).toEqual(['resetClassifier requested confirmation']);
			expect(result.commandsToConfirm).toHaveLength(1);
			expect(result.commandsToConfirm[0]).toMatchObject({
				title: 'remove the fine-tuned classifier',
				btnNo: 'no',
				btnYes: 'Remove it',
			});
			expect(result.commandsToConfirm[0].message).toContain('built-in classifier');
			expect(speciesStore.resetClassifier).not.toHaveBeenCalled();

			await result.commandsToConfirm[0].onConfirm();

			expect(speciesStore.resetClassifier).toHaveBeenCalledOnce();
		});

		test('says that there is no fine-tuned classifier to remove, and does not ask', () => {
			speciesStore.hasTuned = false;

			const result = execCommand(call('resetClassifier', {}));

			expect(result.commandsToConfirm).toEqual([]);
			expect(result.infoForUser).toEqual(['resetClassifier: there is no fine-tuned classifier to remove', 'resetClassifier command failed']);
		});

		test.each([
			['fine-tuning', { isTuning: true }],
			['classifying the flowers', { status: 'classifying' }],
		])('says that the classifier is in use while it is %s, and does not ask', (_, state) => {
			Object.assign(speciesStore, state);

			const result = execCommand(call('resetClassifier', {}));

			expect(result.commandsToConfirm).toEqual([]);
			expect(result.infoForUser).toEqual(['resetClassifier: the classifier is in use, try again in a moment', 'resetClassifier command failed']);
		});
	});
});
