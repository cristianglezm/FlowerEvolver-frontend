// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { reactive, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import mitt from 'mitt';
import AppMenu from '../../../src/components/AppMenu.vue';
import { useRemoteFlowerStore } from '../../../src/stores/RemoteFlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';

// the menu only reads the settings, the actions of LocalFlowerStore need the wasm
const settingsStore = vi.hoisted(() => ({}));
vi.mock('../../../src/stores/SettingsStore', () => ({
    useSettingsStore: () => settingsStore,
}));
vi.mock('../../../src/stores/LocalFlowerStore', () => ({
    useLocalFlowerStore: () => ({}),
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
    describe('the remote buttons of the menu on a phone, which are blocked for two seconds after one is used', () => {
        const IDS = ['menu-new-remote-flower', 'menu-remote-reproduce', 'menu-show-remote-descendants'];
        const buttons = (wrapper) => IDS.map((id) => wrapper.get(`[data-testid="${id}"]`));
        const reopen = (wrapper) => wrapper.get('[data-testid="menu-toggle"]').trigger('click');

        test('are disabled for two seconds, with the attribute of the button, and click nothing meanwhile', async () => {
            vi.useFakeTimers({ toFake: ['setTimeout'] });
            try{
                const RemoteFlowerStore = useRemoteFlowerStore();
                const wrapper = await mountMenu({ width: 390, pagination: true, isLocal: false });
                expect(buttons(wrapper).map((button) => button.element.disabled)).toEqual([false, false, false]);

                // using one closes the menu, and the three are blocked
                await buttons(wrapper)[0].trigger('click');
                expect(RemoteFlowerStore.makeRemoteFlower).toHaveBeenCalledTimes(1);
                await reopen(wrapper);
                expect(buttons(wrapper).map((button) => button.element.disabled)).toEqual([true, true, true]);
                expect(buttons(wrapper)[0].attributes()).toHaveProperty('disabled');

                await buttons(wrapper)[1].trigger('click');
                expect(RemoteFlowerStore.remoteReproduce).not.toHaveBeenCalled();

                vi.advanceTimersByTime(1999);
                await nextTick();
                expect(buttons(wrapper).map((button) => button.element.disabled)).toEqual([true, true, true]);

                vi.advanceTimersByTime(1);
                await nextTick();
                expect(buttons(wrapper).map((button) => button.element.disabled)).toEqual([false, false, false]);
                await buttons(wrapper)[1].trigger('click');
                expect(RemoteFlowerStore.remoteReproduce).toHaveBeenCalledTimes(1);
            }finally{
                vi.useRealTimers();
            }
        });

        test('are the same on a desktop, where they float on the page: blocked with the attribute for two seconds', async () => {
            vi.useFakeTimers({ toFake: ['setTimeout'] });
            try{
                const RemoteFlowerStore = useRemoteFlowerStore();
                const wrapper = await mountMenu({ width: 1440, pagination: true, isLocal: false });
                expect(buttons(wrapper).map((button) => button.element.disabled)).toEqual([false, false, false]);

                await buttons(wrapper)[0].trigger('click');
                expect(RemoteFlowerStore.makeRemoteFlower).toHaveBeenCalledTimes(1);
                expect(buttons(wrapper).map((button) => button.element.disabled)).toEqual([true, true, true]);
                expect(buttons(wrapper)[0].attributes()).toHaveProperty('disabled');
                expect(buttons(wrapper)[0].classes()).not.toContain('disabled');

                await buttons(wrapper)[1].trigger('click');
                expect(RemoteFlowerStore.remoteReproduce).not.toHaveBeenCalled();

                vi.advanceTimersByTime(1999);
                await nextTick();
                expect(buttons(wrapper).map((button) => button.element.disabled)).toEqual([true, true, true]);

                vi.advanceTimersByTime(1);
                await nextTick();
                expect(buttons(wrapper).map((button) => button.element.disabled)).toEqual([false, false, false]);
                await buttons(wrapper)[1].trigger('click');
                expect(RemoteFlowerStore.remoteReproduce).toHaveBeenCalledTimes(1);
            }finally{
                vi.useRealTimers();
            }
        });

        test('the buttons of the browser are not blocked', async () => {
            const wrapper = await mountMenu({ width: 390, pagination: true, isLocal: true });

            const local = wrapper.findAll('[data-testid^="menu-"][data-testid$="local-flower"], [data-testid="menu-local-reproduce"]');

            expect(local.length).toBeGreaterThan(0);
            expect(local.every((button) => button.element.disabled === false)).toBe(true);
        });
    });

    describe('the floating buttons of a desktop', () => {
        test('the one of the chat is at the left edge, and the actions of the tab are at the right edge', async () => {
            const wrapper = await mountMenu({ width: 1440, pagination: true, isLocal: false });
            const edge = (id) => wrapper.get(`[data-testid="${id}"]`).classes();

            expect(edge('menu-toggle-chatbot')).toEqual(expect.arrayContaining(['fixed-button', 'left']));
            for(const id of ['menu-new-remote-flower', 'menu-remote-reproduce', 'menu-show-remote-descendants']){
                expect(edge(id)).toEqual(expect.arrayContaining(['fixed-button', 'right']));
            }
        });

        test('the actions of the browser are at the right edge and none is blocked', async () => {
            const wrapper = await mountMenu({ width: 1440, pagination: true, isLocal: true });
            const local = wrapper.findAll('.fixed-buttons.right button');

            expect(local.map((button) => button.attributes('data-testid'))).toEqual(['menu-new-local-flower', 'menu-local-reproduce', 'menu-show-local-descendants']);
            expect(local.every((button) => button.classes().includes('right') && button.element.disabled === false)).toBe(true);
        });
    });
});
