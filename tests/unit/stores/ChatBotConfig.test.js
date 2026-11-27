import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { execCommand } from '../../../src/stores/ChatBotConfig';
import { useFavouritesStore } from '../../../src/stores/FavouritesStore';
import * as flowerRepository from '../../../src/repositories/flowerRepository';

// Only the commands that call the stores of the application are tested here: the two of the favourites, the two
// that read a flower (`describe`, `mutate`), which go through the repository, and the ones that act on the local
// flowers. The stores have only what those commands use, a command that still asked for more would fail.
const { localFlowerStore, captionerStore } = vi.hoisted(() => ({ localFlowerStore: {}, captionerStore: {} }));
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
