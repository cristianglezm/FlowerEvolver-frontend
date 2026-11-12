// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import Browse from '../../../src/views/Browse.vue';
import PaginationOrInfiniteScroll from '../../../src/components/PaginationOrInfiniteScroll.vue';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';

// The view with the real FlowerStore: the menu and the cards make, reproduce and mutate remote flowers while the
// tab is on screen and the tab has to show them. Only the server is faked (it answers the newest first).
const server = vi.hoisted(() => ({ rows: [], seq: 0, offline: false }));
vi.mock('../../../src/services/flowerApiClient', () => {
    const reach = () => {
        if(server.offline){
            throw { response: undefined };
        }
    };
    const create = () => {
        const id = ++server.seq;
        const flower = { id, genome: `${id}.json`, image: `${id}.png` };
        server.rows.push(flower);
        return flower;
    };
    return {
        API: 'http://test-api.local/',
        mapAxiosError: vi.fn((e, offlineMessage) => (e.response === undefined ? offlineMessage : e.response.data)),
        getFlowers: vi.fn(async ({ limit, offset }) => {
            reach();
            return [...server.rows].reverse().slice(offset, offset + limit);
        }),
        getFlowersCount: vi.fn(async () => {
            reach();
            return server.rows.length;
        }),
        createFlower: vi.fn(async () => { reach(); return create(); }),
        reproduceRemote: vi.fn(async () => { reach(); return create(); }),
        mutateRemote: vi.fn(async () => { reach(); return create(); }),
    };
});
vi.mock('../../../src/services/flowerRepository', () => ({ ensureOpen: vi.fn() }));
vi.mock('../../../src/services/speciesRepository', () => ({}));
vi.mock('../../../src/stores/SpeciesStore', () => ({ useSpeciesStore: () => ({}) }));
vi.mock('../../../src/components/FlowersTable.vue', () => ({
    default: {
        props: ['flowers', 'isLocal', 'noFlowerMessage'],
        template: '<ul class="flowers"><li v-for="flower in flowers" :key="flower.id">{{ flower.id }}</li><li v-if="!flowers.length" class="none">{{ noFlowerMessage }}</li></ul>',
    },
}));

describe('Browse view', () => {
    let FlowerStore;
    let ErrorStore;
    let router;
    let wrapper;

    const addRows = (count) => {
        for(let i = 0; i < count; ++i){
            const id = ++server.seq;
            server.rows.push({ id, genome: `${id}.json`, image: `${id}.png` });
        }
    };
    const mountView = async (path = '/Browse') => {
        await router.push(path);
        wrapper = mount(Browse, { global: { plugins: [router] } });
        await flushPromises();
    };
    const shown = () => wrapper.findAll('.flowers li:not(.none)').map((li) => Number(li.text()));
    const settle = async () => {
        await flushPromises();
        await nextTick();
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        server.rows = [];
        server.seq = 0;
        server.offline = false;
        createTestingPinia({ stubActions: false, createSpy: vi.fn });
        FlowerStore = useFlowerStore();
        ErrorStore = useErrorStore();
        vi.spyOn(ErrorStore, 'push');
        FlowerStore.settings.pagination = false;
        FlowerStore.settings.limit = 3;
        router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/Browse', name: 'Browse', component: { template: '<div />' } }] });
    });

    afterEach(() => {
        wrapper?.unmount();
        wrapper = undefined;
    });

    describe('infinite scroll', () => {
        test('shows the newest flowers of the server first, a batch at a time', async () => {
            addRows(7);
            await mountView();
            expect(shown()).toEqual([7, 6, 5]);

            wrapper.findComponent(PaginationOrInfiniteScroll).vm.$emit('update-page');
            await settle();

            expect(shown()).toEqual([7, 6, 5, 4, 3, 2]);
        });

        test('says that there are no flowers', async () => {
            await mountView();

            expect(wrapper.get('.none').text()).toBe('There are no Flowers');
        });

        test('a flower that is made is at the top', async () => {
            addRows(2);
            await mountView();

            await FlowerStore.makeRemoteFlower();
            await settle();

            expect(shown()).toEqual([3, 2, 1]);
        });

        test('so are the child of two selected flowers and a mutation', async () => {
            addRows(2);
            await mountView();

            FlowerStore.selectRemoteFlower({ id: 1 });
            FlowerStore.selectRemoteFlower({ id: 2 });
            await FlowerStore.remoteReproduce();
            await settle();
            expect(shown()).toEqual([3, 2, 1]);

            await FlowerStore.makeRemoteMutation({ id: 1 });
            await settle();
            expect(shown()).toEqual([4, 3, 2, 1]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('what the server has already when the flower is announced is not shown twice', async () => {
            addRows(2);
            await mountView();
            const { flowerAdded } = await import('../../../src/services/listEvents');

            flowerAdded('remote', { id: 2, genome: '2.json', image: '2.png' });
            await settle();

            expect(shown()).toEqual([2, 1]);
        });

        test('a server that is offline is not an error to show: the list is empty', async () => {
            addRows(3);
            server.offline = true;

            await mountView();

            expect(shown()).toEqual([]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('and a flower that cannot be made says so, and is not shown', async () => {
            addRows(1);
            await mountView();
            server.offline = true;

            await FlowerStore.makeRemoteFlower();
            await settle();

            expect(shown()).toEqual([1]);
            expect(ErrorStore.push).toHaveBeenCalledWith('cannot make a remote flower, server offline');
        });

        test('after the view is gone a flower that is made is not its business', async () => {
            await mountView();
            wrapper.unmount();
            wrapper = undefined;

            await FlowerStore.makeRemoteFlower();
            await flushPromises();

            expect(ErrorStore.push).not.toHaveBeenCalled();
        });
    });

    describe('one page at a time', () => {
        beforeEach(() => {
            FlowerStore.settings.pagination = true;
            addRows(8);
        });
        const clickArrow = async (label) => {
            await wrapper.findAll('button').find((b) => b.text() === label).trigger('click');
            await settle();
        };

        test('starts at the page of the route and counts the pages of the server', async () => {
            await mountView('/Browse?page=1');

            expect(shown()).toEqual([5, 4, 3]);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(3);
        });

        test('the arrows move one page, in place: the route is not pushed again', async () => {
            await mountView();
            const route = router.currentRoute.value.fullPath;

            await clickArrow('>');
            await clickArrow('>');
            expect(shown()).toEqual([2, 1]);
            await clickArrow('<');
            expect(shown()).toEqual([5, 4, 3]);

            expect(router.currentRoute.value.fullPath).toBe(route);
        });

        test('a flower that is made is at the top of the page that is shown', async () => {
            await mountView();

            await FlowerStore.makeRemoteFlower();
            await settle();

            expect(shown()).toEqual([9, 8, 7, 6]);
        });

        test('a server that is offline is reported once, by the count, and the page is empty', async () => {
            server.offline = true;

            await mountView();

            expect(shown()).toEqual([]);
            expect(ErrorStore.push).toHaveBeenCalledTimes(1);
        });
    });
});
