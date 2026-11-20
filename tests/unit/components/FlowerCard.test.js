// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import FlowerCard from '../../../src/components/FlowerCard.vue';
import { useCaptionerStore } from '../../../src/stores/CaptionerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';

// Only the text of the image is looked at here. The card is a lot of stores and components that have their own
// tests, they are replaced by what the card asks of them, and the store of the descriptions is the real one.
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
// three.js is only for the 3D view, and its add-ons cannot be loaded by the tests
vi.mock('../../../src/components/ThreeFlower.vue', () => ({ default: { template: '<div />' } }));
const { getFlowerStats } = vi.hoisted(() => ({ getFlowerStats: vi.fn(() => ({})) }));
vi.mock('../../../src/services/flowerEvolver', () => ({
	getFlowerEvolver: async () => ({ getFlowerStats }),
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
		// the card asks for its stats 100 ms after it is shown: a real timer would fire in a later test
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		CaptionerStore = useCaptionerStore();
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		vi.useRealTimers();
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

// The card shows the params of its own flower in the panel of the "+" button. The panel and ParamsInfo are replaced
// so that what the card gives to ParamsInfo can be read.
describe('FlowerCard, the params of its flower', () => {
	const ParamsInfoStub = { props: ['params'], template: '<div class="params-info" />' };
	const PanelStub = { template: '<div><slot /></div>' };
	const genomeOf = (petals) => JSON.stringify({ Flower: { petals } });
	const DEFAULTS = { radius: 64, numLayers: 3, P: 6.0, bias: 1.0 };
	const emitter = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
	let wrapper;
	let fetchMock;

	const respond = (text, ok = true) => fetchMock.mockResolvedValue({ ok, text: async () => text });
	const mountCard = (props = {}) => {
		wrapper = mount(FlowerCard, {
			props: { id: 7, genome: genomeOf({ radius: 32, numLayers: 2, P: 4, bias: 2 }), image: 'data:image/png;base64,', isLocal: true, ...props },
			global: { provide: { emitter }, stubs: { ZoomableImage: true, StatsInfo: { template: '<div />' }, SpeciesBadge: true, ParamsInfo: ParamsInfoStub, FloatingPanel: PanelStub } },
		});
		return wrapper;
	};
	// what the card gives to ParamsInfo once the "+" button has opened the panel
	const shownParams = async () => {
		const plus = wrapper.findAll('button').find((b) => b.text() === '+');
		await plus.trigger('click');
		return wrapper.getComponent(ParamsInfoStub).props('params');
	};
	// the remote card downloads its genome 100 ms after it is shown
	const download = async () => {
		await vi.advanceTimersByTimeAsync(100);
		await flushPromises();
	};

	beforeEach(() => {
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		vi.stubEnv('VITE_APP_DOWNLOAD_URL', 'http://server/download/');
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		getFlowerStats.mockClear();
		getFlowerStats.mockImplementation(() => ({}));
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		vi.useRealTimers();
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	test('of a flower of the browser are the ones of its genome, and nothing is downloaded', async () => {
		mountCard();
		await download();

		expect(await shownParams()).toEqual({ radius: 32, numLayers: 2, P: 4, bias: 2 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('of a flower of the browser that has a genome that cannot be read are the default ones', async () => {
		mountCard({ genome: 'not a genome' });
		await download();

		expect(await shownParams()).toEqual(DEFAULTS);
	});

	test('of a flower of the browser that has a genome without petals are the default ones', async () => {
		mountCard({ genome: JSON.stringify({ Flower: {} }) });
		await download();

		expect(await shownParams()).toEqual(DEFAULTS);
	});

	test('of a flower of the server are the default ones until its genome is downloaded', async () => {
		respond(genomeOf({ radius: 100, numLayers: 5, P: 3, bias: 0.5 }));
		mountCard({ isLocal: false, genome: '7.json' });
		await flushPromises();

		expect(await shownParams()).toEqual(DEFAULTS);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('of a flower of the server are the ones of the genome that is downloaded', async () => {
		respond(genomeOf({ radius: 100, numLayers: 5, P: 3, bias: 0.5 }));
		mountCard({ isLocal: false, genome: '7.json' });
		await download();

		expect(fetchMock).toHaveBeenCalledWith('http://server/download/7.json');
		expect(await shownParams()).toEqual({ radius: 100, numLayers: 5, P: 3, bias: 0.5 });
	});

	test('of a flower of the server are the ones of its own genome, not those of the flower of the browser with the same id', async () => {
		respond(genomeOf({ radius: 100, numLayers: 5, P: 3, bias: 0.5 }));
		mountCard({ isLocal: false, genome: '7.json', id: 7 });
		await download();

		expect((await shownParams()).radius).toBe(100);
	});

	test('of a flower of the server are kept in the limits that the ones of the browser are', async () => {
		respond(genomeOf({ radius: 1000, numLayers: 0, P: 'x', bias: 'y' }));
		mountCard({ isLocal: false, genome: '7.json' });
		await download();

		expect(await shownParams()).toEqual({ radius: 256, numLayers: 1, P: 6, bias: 1 });
	});

	test('of a flower of the server are the default ones when the server does not answer, and no error is shown', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		mountCard({ isLocal: false, genome: '7.json' });
		await download();

		expect(await shownParams()).toEqual(DEFAULTS);
		expect(useErrorStore().getLength).toBe(0);
		expect(getFlowerStats).not.toHaveBeenCalled();
	});

	test('of a flower of the server are the default ones when the server answers with an error', async () => {
		respond(genomeOf({ radius: 100, numLayers: 5, P: 3, bias: 0.5 }), false);
		mountCard({ isLocal: false, genome: '7.json' });
		await download();

		expect(await shownParams()).toEqual(DEFAULTS);
		expect(getFlowerStats).not.toHaveBeenCalled();
	});

	test('of a flower of the server are the default ones when what is downloaded is not a genome', async () => {
		respond('<html>not found</html>');
		mountCard({ isLocal: false, genome: '7.json' });
		await download();

		expect(await shownParams()).toEqual(DEFAULTS);
	});

	test('of a flower of the server are given to the stats too, the genome is downloaded once', async () => {
		const genome = genomeOf({ radius: 100, numLayers: 5, P: 3, bias: 0.5 });
		respond(genome);
		mountCard({ isLocal: false, genome: '7.json' });
		await download();

		expect(getFlowerStats).toHaveBeenCalledTimes(1);
		expect(getFlowerStats.mock.calls[0][0]).toBe(genome);
	});
});
