// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import FlowerCard from '../../../src/components/FlowerCard.vue';
import FavouriteButton from '../../../src/components/ui/FavouriteButton.vue';
import ChevronButton from '../../../src/components/ui/ChevronButton.vue';
import ThreeFlower from '../../../src/components/ThreeFlower.vue';
import { useCaptionerStore } from '../../../src/stores/CaptionerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';

// Only the text of the image is looked at here. The card is a lot of stores and components that have their own
// tests, they are replaced by what the card asks of them, and the store of the descriptions is the real one.
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
// three.js is only for the 3D view, and its add-ons cannot be loaded by the tests
vi.mock('../../../src/components/ThreeFlower.vue', () => ({ default: { props: ['emissive', 'genome'], template: '<div class="three" />' } }));
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
const favourites = vi.hoisted(() => ({ isFavourited: vi.fn(), addFlowerToFav: vi.fn(), removeFlowerFromFav: vi.fn() }));
vi.mock('../../../src/stores/FavouritesStore', () => ({ useFavouritesStore: () => favourites }));
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
		favourites.isFavourited.mockReset().mockResolvedValue(false);
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
		await wrapper.get('[data-testid="flower-more"]').trigger('click');
		return wrapper.getComponent(ParamsInfoStub).props('params');
	};
	// the remote card downloads its genome 100 ms after it is shown
	const download = async () => {
		await vi.advanceTimersByTimeAsync(100);
		await flushPromises();
	};

	beforeEach(() => {
		favourites.isFavourited.mockReset().mockResolvedValue(false);
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

describe('FlowerCard, its heart', () => {
	const emitter = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
	let wrapper;
	const mountCard = (props = {}) => {
		wrapper = mount(FlowerCard, {
			props: { id: 5, genome: GENOME, image: 'data:image/png;base64,', isLocal: true, ...props },
			global: { provide: { emitter }, stubs: { ZoomableImage: true, ParamsInfo: true, StatsInfo: true, FloatingPanel: true, SpeciesBadge: true } },
		});
		return wrapper;
	};
	const heart = () => wrapper.getComponent(FavouriteButton);

	beforeEach(() => {
		favourites.isFavourited.mockReset().mockResolvedValue(false);
		favourites.addFlowerToFav.mockReset().mockResolvedValue(undefined);
		favourites.removeFlowerFromFav.mockReset();
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		vi.useRealTimers();
	});

	test('is not known until the database has answered, then it is the answer', async () => {
		mountCard();
		expect(heart().props('favourited')).toBeNull();

		await flushPromises();

		expect(favourites.isFavourited).toHaveBeenCalledWith(5);
		expect(heart().props('favourited')).toBe(false);
	});

	test('is full for a flower that is a favourite', async () => {
		favourites.isFavourited.mockResolvedValue(true);

		mountCard();
		await flushPromises();

		expect(heart().props('favourited')).toBe(true);
		expect(heart().attributes('data-testid')).toBe('flower-favourite');
	});

	test('makes the flower a favourite when it is clicked, and the heart answers before the database does', async () => {
		let saved;
		favourites.addFlowerToFav.mockReturnValue(new Promise((resolve) => { saved = resolve; }));
		mountCard();
		await flushPromises();

		await heart().trigger('click');
		await flushPromises();

		expect(heart().props('favourited')).toBe(true);
		expect(favourites.addFlowerToFav).toHaveBeenCalledExactlyOnceWith(5);
		expect(favourites.removeFlowerFromFav).not.toHaveBeenCalled();
		saved();
	});

	test('takes the flower out of the favourites when it is clicked and it is one', async () => {
		favourites.isFavourited.mockResolvedValue(true);
		mountCard();
		await flushPromises();

		await heart().trigger('click');
		await flushPromises();

		expect(heart().props('favourited')).toBe(false);
		expect(favourites.removeFlowerFromFav).toHaveBeenCalledExactlyOnceWith(5);
		expect(favourites.addFlowerToFav).not.toHaveBeenCalled();
	});

	test('of a flower of the server is disabled, empty, and does not touch the favourites', async () => {
		mountCard({ isLocal: false, genome: '5.json' });
		await flushPromises();

		expect(heart().element.disabled).toBe(true);
		expect(heart().props('favourited')).toBe(false);
		expect(heart().attributes('data-testid')).toBeUndefined();
		await heart().trigger('click');
		await flushPromises();
		expect(favourites.isFavourited).not.toHaveBeenCalled();
		expect(favourites.addFlowerToFav).not.toHaveBeenCalled();
	});
});

describe.each([
	['of the browser', true, '5'],
	['of the server', false, '5.json'],
])('FlowerCard %s, its menus', (_, isLocal, genome) => {
	const emitter = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
	const PanelStub = { template: '<div class="panel"><slot /></div>' };
	let wrapper;
	const mountCard = () => {
		wrapper = mount(FlowerCard, {
			props: { id: 5, genome: isLocal ? GENOME : genome, image: 'data:image/png;base64,', isLocal },
			global: { provide: { emitter }, stubs: { ZoomableImage: true, ParamsInfo: true, StatsInfo: true, FloatingPanel: PanelStub, SpeciesBadge: true } },
		});
		return wrapper;
	};
	const byId = (id) => wrapper.find(`[data-testid="${id}"]`);
	const chevron = () => wrapper.getComponent(ChevronButton);

	beforeEach(() => {
		favourites.isFavourited.mockReset().mockResolvedValue(false);
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	test('the chevron opens the main menu, turns over, and closes it when it is clicked again', async () => {
		mountCard();
		expect(byId('flower-mutate').exists()).toBe(false);
		expect(chevron().props('open')).toBe(false);

		await byId('flower-menu-toggle').trigger('click');
		expect(byId('flower-mutate').exists()).toBe(true);
		expect(chevron().props('open')).toBe(true);

		await byId('flower-menu-toggle').trigger('click');
		expect(byId('flower-mutate').exists()).toBe(false);
		expect(chevron().props('open')).toBe(false);
	});

	test('a link of the main menu closes it', async () => {
		mountCard();
		await byId('flower-menu-toggle').trigger('click');

		await wrapper.findAll('.main-menu a').find((a) => a.text() === 'Show Mutations').trigger('click');

		expect(byId('flower-mutate').exists()).toBe(false);
		expect(chevron().props('open')).toBe(false);
	});

	test('the + opens the secondary menu with 3D and E3D, and closes it when it is clicked again', async () => {
		mountCard();
		expect(byId('flower-3d').exists()).toBe(false);

		await byId('flower-more').trigger('click');
		expect(byId('flower-3d').exists()).toBe(true);
		expect(byId('flower-e3d').exists()).toBe(true);
		expect(byId('flower-more').text()).toBe('+');

		await byId('flower-more').trigger('click');
		expect(byId('flower-3d').exists()).toBe(false);
	});

	test('3D shows the flower in 3D, and closes the menu', async () => {
		mountCard();
		expect(wrapper.findComponent(ThreeFlower).exists()).toBe(false);
		await byId('flower-more').trigger('click');

		await byId('flower-3d').trigger('click');

		expect(wrapper.findComponent(ThreeFlower).props('emissive')).toBe(false);
		expect(byId('flower-3d').exists()).toBe(false);
	});

	test('E3D shows it with the emissive 3D, and pressing it again goes back to the image', async () => {
		mountCard();
		await byId('flower-more').trigger('click');
		await byId('flower-e3d').trigger('click');
		expect(wrapper.findComponent(ThreeFlower).props('emissive')).toBe(true);

		await byId('flower-more').trigger('click');
		await byId('flower-e3d').trigger('click');

		expect(wrapper.findComponent(ThreeFlower).exists()).toBe(false);
	});

	test('the buttons of the secondary menu are green buttons with no margin of their own', async () => {
		mountCard();
		await byId('flower-more').trigger('click');

		for(const id of ['flower-more', 'flower-3d', 'flower-e3d']){
			expect(byId(id).classes()).toContain('safe-button');
			expect(byId(id).element.tagName).toBe('BUTTON');
		}
		expect(byId('flower-more').classes()).toContain('symbol');
		expect(byId('flower-3d').classes()).toContain('compact');
		expect(byId('flower-e3d').classes()).toContain('compact');
	});
});
