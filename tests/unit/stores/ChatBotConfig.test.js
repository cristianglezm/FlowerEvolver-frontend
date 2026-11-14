import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { execCommand } from '../../../src/stores/ChatBotConfig';
import { useFavouritesStore } from '../../../src/stores/FavouritesStore';

// Only the two commands of the favourites are tested here: they call the store that has the favourites. The store
// of the flowers is empty on purpose, a command that still asked it for them would fail.
vi.mock('../../../src/stores/FlowerStore', () => ({ useFlowerStore: () => ({}) }));
vi.mock('../../../src/stores/CaptionerStore', () => ({ useCaptionerStore: () => ({}) }));
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
