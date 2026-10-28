// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { reactive } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import mitt from 'mitt';
import AppMenu from '../../../src/components/AppMenu.vue';

// the menu only reads the settings of FlowerStore, the rest of that store needs the wasm
const flowerStore = vi.hoisted(() => ({}));
vi.mock('../../../src/stores/FlowerStore', () => ({
    useFlowerStore: () => flowerStore,
}));

const page = { template: '<div />' };

describe('AppMenu tabs', () => {
    let router;

    // the names of the tabs in the order they are shown, with where each one goes
    const tabs = (wrapper) => wrapper.findAll('nav.tabs a').map((link) => [link.text(), link.attributes('href')]);
    const mountMenu = async ({ width, pagination }) => {
        window.innerWidth = width;
        flowerStore.settings = reactive({ pagination, showChatBot: false });
        const wrapper = mount(AppMenu, {
            props: { isLocal: true },
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
                .map((name) => ({ path: '/' + name, name, component: page })),
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
});
