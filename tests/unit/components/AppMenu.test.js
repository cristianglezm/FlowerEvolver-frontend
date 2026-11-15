// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import mitt from 'mitt';
import AppMenu from '../../../src/components/AppMenu.vue';
import { useRemoteFlowerStore } from '../../../src/stores/RemoteFlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';

// the menu only reads the settings, the actions of FlowerStore need the wasm
const settingsStore = vi.hoisted(() => ({}));
vi.mock('../../../src/stores/SettingsStore', () => ({
    useSettingsStore: () => settingsStore,
}));
vi.mock('../../../src/stores/FlowerStore', () => ({
    useFlowerStore: () => ({}),
}));

const page = { template: '<div />' };

describe('AppMenu tabs', () => {
    let router;

    // the names of the tabs in the order they are shown, with where each one goes
    const tabs = (wrapper) => wrapper.findAll('nav.tabs a').map((link) => [link.text(), link.attributes('href')]);
    const mountMenu = async ({ width, pagination, isLocal = true }) => {
        window.innerWidth = width;
        settingsStore.settings = reactive({ pagination, showChatBot: false });
        const wrapper = mount(AppMenu, {
            props: { isLocal },
            global: {
                plugins: [router],
                provide: { emitter: mitt() },
                stubs: { ErrorModal: true, ConfirmModal: true },
            },
        });
        if(width <= 1280){
            await wrapper.get('[data-testid="menu-toggle"]').trigger('click');
        }
        return wrapper;
    };

    beforeEach(async () => {
        createTestingPinia({ createSpy: vi.fn });
        router = createRouter({
            history: createMemoryHistory(),
            routes: ['Local', 'LastAdded', 'Browse', 'Favourites', 'Species', 'Charts', 'Downloads', 'Settings']
                .map((name) => ({ path: '/' + name, name, component: page }))
                .concat({ path: '/Descendants/:father/:mother/:isLocal', name: 'DescendantsFatherAndMother', component: page }),
        });
        router.push('/Local');
        await router.isReady();
    });

    test.each([
        ['desktop, a page at a time', 1440, true, '/Species?page=0'],
        ['desktop, infinite scroll', 1440, false, '/Species'],
        ['mobile, a page at a time', 390, true, '/Species?page=0'],
        ['mobile, infinite scroll', 390, false, '/Species'],
    ])('%s: the Species tab is between Favourites and Charts', async (_, width, pagination, species) => {
        const wrapper = await mountMenu({ width, pagination });
        const links = tabs(wrapper);
        const names = links.map(([name]) => name);

        expect(names).toEqual(['Local', 'Last Added', 'Browse', 'Favourites', 'Species', 'Charts', 'Downloads', 'Settings']);
        expect(links[names.indexOf('Species')][1]).toBe(species);
    });

    // the buttons of the remote tabs: floating on a desktop, in the menu on a mobile
    describe.each([
        ['desktop', 1440],
        ['mobile', 390],
    ])('the actions of the remote tabs, %s', (_, width) => {
        let RemoteFlowerStore;
        let ErrorStore;
        const click = (wrapper, testid) => wrapper.get(`[data-testid="${testid}"]`).trigger('click');

        beforeEach(() => {
            RemoteFlowerStore = useRemoteFlowerStore();
            ErrorStore = useErrorStore();
        });

        test('New Remote Flower makes a remote flower', async () => {
            const wrapper = await mountMenu({ width, pagination: true, isLocal: false });

            await click(wrapper, 'menu-new-remote-flower');

            expect(RemoteFlowerStore.makeRemoteFlower).toHaveBeenCalledTimes(1);
            expect(RemoteFlowerStore.remoteReproduce).not.toHaveBeenCalled();
        });

        test('Remote Reproduce Selected reproduces the remote flowers that are selected', async () => {
            const wrapper = await mountMenu({ width, pagination: true, isLocal: false });

            await click(wrapper, 'menu-remote-reproduce');

            expect(RemoteFlowerStore.remoteReproduce).toHaveBeenCalledTimes(1);
            expect(RemoteFlowerStore.makeRemoteFlower).not.toHaveBeenCalled();
        });

        test('Show Remote Selected Descendants goes to the descendants of the remote pair that is selected', async () => {
            RemoteFlowerStore.remoteSelected.flowers = [3, 4];
            const wrapper = await mountMenu({ width, pagination: true, isLocal: false });

            await click(wrapper, 'menu-show-remote-descendants');
            await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('DescendantsFatherAndMother'));

            expect(router.currentRoute.value.params).toEqual({ father: '3', mother: '4', isLocal: 'remote' });
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('Show Remote Selected Descendants asks for two flowers when none is selected', async () => {
            const wrapper = await mountMenu({ width, pagination: true, isLocal: false });

            await click(wrapper, 'menu-show-remote-descendants');

            expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith('You need to select two flowers');
            expect(router.currentRoute.value.name).toBe('Local');
        });
    });
});
