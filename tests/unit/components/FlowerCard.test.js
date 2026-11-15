// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import FlowerCard from '../../../src/components/FlowerCard.vue';
import { useCaptionerStore } from '../../../src/stores/CaptionerStore';

// Only the text of the image is looked at here. The card is a lot of stores and components that have their own
// tests, they are replaced by what the card asks of them, and the store of the descriptions is the real one.
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
// three.js is only for the 3D view, and its add-ons cannot be loaded by the tests
vi.mock('../../../src/components/ThreeFlower.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../../../src/services/flowerEvolver', () => ({
	getFlowerEvolver: async () => ({ getFlowerStats: () => ({}) }),
}));
vi.mock('../../../src/services/flowerRepository', () => ({
	addDescription: vi.fn(),
	listDescriptions: vi.fn(),
	bulkGetDescriptions: vi.fn(),
}));
vi.mock('../../../src/workers/captioner.worker?worker', () => ({
	default: vi.fn(() => ({ onmessage: null, onerror: null, postMessage: vi.fn() })),
}));
vi.mock('../../../src/stores/LocalFlowerStore', () => ({ useLocalFlowerStore: () => ({ isLocalFlowerSelected: () => false }) }));
vi.mock('../../../src/stores/RemoteFlowerStore', () => ({ useRemoteFlowerStore: () => ({ isRemoteFlowerSelected: () => false }) }));
vi.mock('../../../src/stores/FavouritesStore', () => ({ useFavouritesStore: () => ({ isFavourited: async () => false }) }));
vi.mock('../../../src/stores/SettingsStore', () => ({ useSettingsStore: () => ({ settings: { magnification: 2 } }) }));

const stubs = {
	ZoomableImage: { template: '<img class="flower-image" />' },
	ParamsInfo: true,
	StatsInfo: true,
	FloatingPanel: true,
	SpeciesBadge: true,
};
// what the card reads of a genome on mount: the params of the petals
const GENOME = JSON.stringify({ Flower: { petals: { radius: 32, numLayers: 2, P: 6, bias: 1 } } });
const DEFAULT = 'Flower 5 - click describe for a better description';

describe('FlowerCard, the text of its image', () => {
	let CaptionerStore;
	let wrapper;
	const emitter = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
	const mountCard = (props = {}) => {
		wrapper = mount(FlowerCard, {
			props: { id: 5, genome: GENOME, image: 'data:image/png;base64,', isLocal: true, ...props },
			global: { provide: { emitter }, stubs },
		});
		return wrapper;
	};
	const alt = () => wrapper.get('.flower-image').attributes('alt');

	beforeEach(() => {
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		CaptionerStore = useCaptionerStore();
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
	});

	test('is the default text when the store has no description of the flower', async () => {
		mountCard();
		await flushPromises();

		expect(alt()).toBe(DEFAULT);
	});

	test('is the description of the store when it has it when the card is shown', async () => {
		CaptionerStore.localDescriptions.set(5, 'a red flower');

		mountCard();
		await flushPromises();

		expect(alt()).toBe('Flower 5 - a red flower');
	});

	test('becomes the description when the store gets it after the card is shown, as a list loads them', async () => {
		mountCard();
		await flushPromises();
		expect(alt()).toBe(DEFAULT);

		CaptionerStore.localDescriptions.set(5, 'a red flower');
		await nextTick();

		expect(alt()).toBe('Flower 5 - a red flower');
	});

	test('is not changed by the description of another flower', async () => {
		mountCard();
		await flushPromises();

		CaptionerStore.localDescriptions.set(6, 'another flower');
		await nextTick();

		expect(alt()).toBe(DEFAULT);
	});

	test('follows the card when its flower changes, and goes back to the default when the store has none of it', async () => {
		CaptionerStore.localDescriptions.set(5, 'a red flower');
		mountCard();
		await flushPromises();
		expect(alt()).toBe('Flower 5 - a red flower');

		CaptionerStore.localDescriptions.delete(5);
		await nextTick();

		expect(alt()).toBe(DEFAULT);
	});

	test('is the one that the captioner makes for it, when it is asked to describe the flower', async () => {
		mountCard();
		await flushPromises();

		CaptionerStore.channel.emit('captioner#done', { id: 5, description: 'a new description' });
		await nextTick();

		expect(alt()).toBe('Flower 5 - a new description');
	});

	test('of a flower of the server is not the description of a flower of the browser with the same id', async () => {
		CaptionerStore.localDescriptions.set(5, 'a flower of the browser');

		mountCard({ isLocal: false });
		await flushPromises();

		expect(alt()).toBe(DEFAULT);
	});
});
