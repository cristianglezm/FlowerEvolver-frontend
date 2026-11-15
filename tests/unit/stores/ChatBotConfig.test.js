import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { execCommand } from '../../../src/stores/ChatBotConfig';
import { useFavouritesStore } from '../../../src/stores/FavouritesStore';
import * as flowerRepository from '../../../src/services/flowerRepository';

// Only the commands that were moved to the stores they belong to are tested here: the two of the favourites, and the
// two that read a flower (`describe`, `mutate`), which go through the repository and not through a store. The stores
// have only what those commands use, a command that still asked for more would fail.
const { flowerStore, captionerStore } = vi.hoisted(() => ({ flowerStore: {}, captionerStore: {} }));
vi.mock('../../../src/stores/FlowerStore', () => ({ useFlowerStore: () => flowerStore }));
vi.mock('../../../src/stores/CaptionerStore', () => ({ useCaptionerStore: () => captionerStore }));
vi.mock('../../../src/services/flowerRepository', () => ({ getFlower: vi.fn() }));
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
		flowerStore.makeLocalMutation = vi.fn();
		captionerStore.loadAndConcatLocalDescriptions = vi.fn(() => new Promise(() => {}));
	});

	describe('mutate', () => {
		test('mutates the flower that the repository has', async () => {
			const flower = { id: 7, genome: 'g', image: 'i' };
			flowerRepository.getFlower.mockResolvedValue(flower);

			const result = execCommand(call('mutate', { id: 7 }));
			await vi.waitFor(() => expect(flowerStore.makeLocalMutation).toHaveBeenCalledExactlyOnceWith(flower));

			expect(flowerRepository.getFlower).toHaveBeenCalledExactlyOnceWith(7);
			expect(result.infoForUser).toEqual(['mutate command executed.']);
		});

		test('says so when the flower is not there', async () => {
			flowerRepository.getFlower.mockRejectedValue(new Error('not found'));

			const result = execCommand(call('mutate', { id: 7 }));
			await vi.waitFor(() => expect(result.infoForUser).toContain('mutate command not executed, Flower not found'));

			expect(flowerStore.makeLocalMutation).not.toHaveBeenCalled();
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
