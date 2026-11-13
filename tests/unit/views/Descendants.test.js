// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import Descendants from '../../../src/views/Descendants.vue';
import PaginationOrInfiniteScroll from '../../../src/components/PaginationOrInfiniteScroll.vue';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { flowerAdded } from '../../../src/services/listEvents';

// The view with the real FlowerStore and the real wasm: two flowers are selected and reproduced while the tab is on
// screen. The child is a child of the pair that was selected, so it belongs to the tab of that pair (the father
// first, as the table says) and to the tab of each of the two flowers, and to no other: the tab shows what it shows
// when it is read again. What is behind the store is faked: the tables of the browser, and the server.
const local = vi.hoisted(() => ({ flowers: [], descendants: [], seq: 0 }));
const server = vi.hoisted(() => ({ flowers: [], descendants: [], seq: 0, offline: false }));
// the rows of the one that has `id` as father or as mother, or of the pair, the newest first
const ofOne = (rows, id) => rows.filter((d) => d.father === id || d.mother === id);
const ofPair = (rows, father, mother) => rows.filter((d) => d.father === father && d.mother === mother);
const newest = (rows) => [...rows].sort((a, b) => b.id - a.id);
vi.mock('../../../src/services/flowerRepository', () => ({
    ensureOpen: vi.fn(),
    addFlower: vi.fn(async (flower) => {
        const id = ++local.seq;
        local.flowers.push({ ...flower, id });
        return id;
    }),
    getFlower: vi.fn(async (id) => {
        const f = local.flowers.find((row) => row.id === id);
        return f === undefined ? undefined : { ...f };
    }),
    addDescendant: vi.fn(async (entry) => { local.descendants.push({ ...entry }); }),
    countDescendantsByParent: vi.fn(async (father) => ofOne(local.descendants, father).length),
    countDescendantsByParents: vi.fn(async (father, mother) => ofPair(local.descendants, father, mother).length),
    listDescendantsByParent: vi.fn(async ({ fatherID, limit, offset }) => newest(ofOne(local.descendants, fatherID)).slice(offset, offset + limit)),
    listDescendantsByParents: vi.fn(async ({ fatherID, motherID, limit, offset }) => newest(ofPair(local.descendants, fatherID, motherID)).slice(offset, offset + limit)),
    removeFavourite: vi.fn(async () => {}),
    deleteDescription: vi.fn(async () => {}),
    deleteDescendant: vi.fn(async () => {}),
    deleteFlower: vi.fn(async (id) => { local.flowers = local.flowers.filter((f) => f.id !== id); }),
    findMutationsByOriginalOrId: vi.fn(async () => []),
    bulkDeleteMutations: vi.fn(async () => {}),
    wipeDatabase: vi.fn(async () => { local.flowers = []; local.descendants = []; local.seq = 0; }),
}));
vi.mock('../../../src/services/flowerApiClient', () => {
    const reach = () => {
        if(server.offline){
            throw { response: undefined };
        }
    };
    const rows = (father, mother) => (mother === undefined || mother === null ? ofOne(server.descendants, father) : ofPair(server.descendants, father, mother));
    return {
        API: 'http://test-api.local/',
        mapAxiosError: vi.fn((e, offlineMessage) => (e.response === undefined ? offlineMessage : e.response.data)),
        getDescendants: vi.fn(async (father, mother, { limit, offset }) => {
            reach();
            return newest(rows(father, mother)).slice(offset, offset + limit).map((d) => server.flowers.find((f) => f.id === d.id));
        }),
        getDescendantsCount: vi.fn(async (father, mother) => {
            reach();
            return rows(father, mother).length;
        }),
        reproduceRemote: vi.fn(async (father, mother) => {
            reach();
            const id = ++server.seq;
            const flower = { id, genome: `${id}.json`, image: `${id}.png` };
            server.flowers.push(flower);
            server.descendants.push({ id, father, mother });
            return flower;
        }),
    };
});
vi.mock('../../../src/services/speciesRepository', () => ({ bulkGetSpecies: vi.fn(async () => []), bulkPutSpecies: vi.fn(async () => {}) }));
vi.mock('../../../src/stores/SpeciesStore', () => ({
    useSpeciesStore: () => ({ classifyLater: vi.fn(), removeFlower: vi.fn(async () => {}), invalidate: vi.fn() }),
}));
vi.mock('../../../src/components/FlowerCard.vue', () => ({
    default: { props: ['id', 'genome', 'image', 'isLocal'], template: '<div class="card" :data-local="isLocal">{{ id }}</div>' },
}));
vi.mock('../../../src/components/FlowersTable.vue', () => ({
    default: {
        props: ['flowers', 'isLocal', 'noFlowerMessage'],
        template: '<ul class="flowers"><li v-for="flower in flowers" :key="flower.id">{{ flower.id }}</li><li v-if="!flowers.length" class="none">{{ noFlowerMessage }}</li></ul>',
    },
}));

describe('Descendants view', () => {
    let FlowerStore;
    let ErrorStore;
    let router;
    let wrapper;

    // three flowers with a real genome, so that they can be reproduced: the flowers 1, 2 and 3
    const makeParents = async () => {
        await FlowerStore.makeLocalFlower();
        await FlowerStore.makeLocalFlower();
        await FlowerStore.makeLocalFlower();
    };
    // `father` is the first flower that is selected and `mother` the second
    const reproduce = async (father, mother) => {
        FlowerStore.selectLocalFlower({ id: father });
        FlowerStore.selectLocalFlower({ id: mother });
        await FlowerStore.localReproduce();
        await flushPromises();
    };
    // children that are in the table already: of (father, mother)
    const addLocalChildren = (father, mother, count) => {
        for(let i = 0; i < count; ++i){
            const id = ++local.seq;
            local.flowers.push({ id, genome: 'g', image: 'i' });
            local.descendants.push({ id, father, mother });
        }
    };
    const addServerChildren = (father, mother, count) => {
        for(let i = 0; i < count; ++i){
            const id = ++server.seq;
            server.flowers.push({ id, genome: `${id}.json`, image: `${id}.png` });
            server.descendants.push({ id, father, mother });
        }
    };
    const mountView = async (path) => {
        await router.push(path);
        wrapper = mount(Descendants, { global: { plugins: [router] } });
        await flushPromises();
    };
    const shown = () => wrapper.findAll('.flowers li:not(.none)').map((li) => Number(li.text()));
    const settle = async () => {
        await flushPromises();
        await nextTick();
    };
    // what the tab shows when it is opened again
    const reopened = async (path) => {
        wrapper.unmount();
        await mountView(path);
        return shown();
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        local.flowers = [];
        local.descendants = [];
        local.seq = 0;
        server.flowers = [];
        server.descendants = [];
        server.seq = 0;
        server.offline = false;
        createTestingPinia({ stubActions: false, createSpy: vi.fn });
        FlowerStore = useFlowerStore();
        ErrorStore = useErrorStore();
        vi.spyOn(ErrorStore, 'push');
        FlowerStore.settings.pagination = false;
        FlowerStore.settings.limit = 3;
        router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/Descendants/:isLocal/:father/:mother', name: 'DescendantsFatherAndMother', component: { template: '<div />' } },
                { path: '/Descendants/:isLocal/:father', name: 'DescendantsFatherOrMother', component: { template: '<div />' } },
            ],
        });
    });

    afterEach(() => {
        wrapper?.unmount();
        wrapper = undefined;
    });

    describe('the flowers of one flower, of this browser', () => {
        test('shows the card and the children that have it as father or as mother, the newest first', async () => {
            await makeParents();
            addLocalChildren(1, 2, 1);
            addLocalChildren(3, 1, 1);
            addLocalChildren(2, 3, 1);
            addLocalChildren(1, 1, 1);
            await mountView('/Descendants/local/1');

            expect(wrapper.get('.card').text()).toBe('1');
            expect(wrapper.get('.card').attributes('data-local')).toBe('true');
            expect(wrapper.get('.header').text()).toBe('Descendants of 1');
            // 4 is of (1, 2), 5 of (3, 1), 7 of (1, 1), and 6 is of (2, 3)
            expect(shown()).toEqual([7, 5, 4]);
        });

        test('a batch at a time', async () => {
            await makeParents();
            addLocalChildren(1, 2, 5);
            await mountView('/Descendants/local/1');
            expect(shown()).toEqual([8, 7, 6]);

            wrapper.findComponent(PaginationOrInfiniteScroll).vm.$emit('update-page');
            await settle();

            expect(shown()).toEqual([8, 7, 6, 5, 4]);
        });

        test('says that the flower has no descendants', async () => {
            await makeParents();
            await mountView('/Descendants/local/1');

            expect(wrapper.get('.none').text()).toBe('This Flower has no descendants.');
        });

        // the e2e spec 'selecting two local flowers enables reproduction', seen from this tab
        test('the child of two selected flowers is at the top of the tab of each of them, and of no other', async () => {
            await makeParents();
            await mountView('/Descendants/local/1');
            expect(shown()).toEqual([]);

            await reproduce(1, 2);
            expect(shown()).toEqual([4]);
            await reproduce(3, 1);
            expect(shown()).toEqual([5, 4]);
            // of (2, 3): not a child of the flower 1
            await reproduce(2, 3);
            expect(shown()).toEqual([5, 4]);

            expect(ErrorStore.push).not.toHaveBeenCalled();
            expect(await reopened('/Descendants/local/1')).toEqual([5, 4]);
            expect(await reopened('/Descendants/local/2')).toEqual([6, 4]);
            expect(await reopened('/Descendants/local/3')).toEqual([6, 5]);
        });

        test('a flower with itself is a child of that flower, once', async () => {
            await makeParents();
            await mountView('/Descendants/local/1');

            await reproduce(1, 1);

            expect(shown()).toEqual([4]);
            expect(await reopened('/Descendants/local/1')).toEqual([4]);
        });

        test('a flower that is not there has no card, and its descendants are listed all the same', async () => {
            addLocalChildren(7, 8, 2);
            await mountView('/Descendants/local/7');

            expect(wrapper.find('.card').exists()).toBe(false);
            expect(shown()).toEqual([2, 1]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('a descendant whose flower is gone is left out, the rest are shown', async () => {
            await makeParents();
            addLocalChildren(1, 2, 2);
            local.descendants.push({ id: 99, father: 1, mother: 2 });
            await mountView('/Descendants/local/1');

            expect(shown()).toEqual([5, 4]);
        });

        test('a child that is deleted goes away, and deleting every flower leaves it empty', async () => {
            await makeParents();
            addLocalChildren(1, 2, 3);
            await mountView('/Descendants/local/1');

            await FlowerStore.deleteLocalFlower(5);
            await settle();
            expect(shown()).toEqual([6, 4]);

            await FlowerStore.deleteAllFlowers();
            await settle();
            expect(shown()).toEqual([]);
        });
    });

    describe('the flowers of a pair, of this browser', () => {
        test('shows the two cards and only the children of that pair, the father first', async () => {
            await makeParents();
            addLocalChildren(1, 2, 2);
            addLocalChildren(2, 1, 1);
            addLocalChildren(1, 3, 1);
            await mountView('/Descendants/local/1/2');

            expect(wrapper.findAll('.card').map((c) => c.text())).toEqual(['1', '2']);
            expect(wrapper.get('.header').text()).toBe('Descendants of 1 and 2');
            expect(shown()).toEqual([5, 4]);
        });

        test('says that the pair has no descendants', async () => {
            await makeParents();
            await mountView('/Descendants/local/1/2');

            expect(wrapper.get('.none').text()).toBe('These Flowers have no descendants.');
        });

        test('the child of the pair is at the top, and the child of the same two in the other order is not: it is in the tab of that pair', async () => {
            await makeParents();
            await mountView('/Descendants/local/1/2');

            await reproduce(1, 2);
            expect(shown()).toEqual([4]);
            await reproduce(2, 1);
            await reproduce(1, 3);
            expect(shown()).toEqual([4]);

            expect(await reopened('/Descendants/local/1/2')).toEqual([4]);
            expect(await reopened('/Descendants/local/2/1')).toEqual([5]);
            expect(await reopened('/Descendants/local/1/3')).toEqual([6]);
        });

        test('what is shown is what the tab shows when it is opened again, whatever was reproduced', async () => {
            await makeParents();
            await mountView('/Descendants/local/1/2');
            await reproduce(1, 2);
            await reproduce(3, 3);
            await reproduce(1, 2);
            await reproduce(2, 1);
            await settle();
            const live = shown();

            expect(live).toEqual([6, 4]);
            expect(await reopened('/Descendants/local/1/2')).toEqual(live);
        });

        test('a child that is announced when it is in the list already is not shown twice', async () => {
            await makeParents();
            addLocalChildren(1, 2, 1);
            await mountView('/Descendants/local/1/2');

            flowerAdded('localDescendants', { id: 4, genome: 'g', image: 'i' }, { father: 1, mother: 2 });
            flowerAdded('localDescendants', { id: 50, genome: 'g', image: 'i' });
            await settle();

            expect(shown()).toEqual([4]);
        });
    });

    describe('local and remote are two lists', () => {
        test('the children of the server are not in the tab of the browser, nor the other way round', async () => {
            await makeParents();
            await mountView('/Descendants/local/1/2');
            const { reproduceRemote } = await import('../../../src/services/flowerApiClient');

            FlowerStore.selectRemoteFlower({ id: 1 });
            FlowerStore.selectRemoteFlower({ id: 2 });
            await FlowerStore.remoteReproduce();
            await settle();
            expect(reproduceRemote).toHaveBeenCalledWith(1, 2);
            expect(shown()).toEqual([]);

            wrapper.unmount();
            await mountView('/Descendants/remote/1/2');
            expect(shown()).toEqual([1]);
            await reproduce(1, 2);
            expect(shown()).toEqual([1]);
        });

        test('after the view is gone a child is not its business', async () => {
            await makeParents();
            await mountView('/Descendants/local/1/2');
            wrapper.unmount();
            wrapper = undefined;

            await reproduce(1, 2);

            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('a table that cannot be read goes to the ErrorStore', async () => {
            const { listDescendantsByParents } = await import('../../../src/services/flowerRepository');
            const failure = new Error('IndexedDB is closed');
            listDescendantsByParents.mockRejectedValueOnce(failure);

            await mountView('/Descendants/local/1/2');

            expect(ErrorStore.push).toHaveBeenCalledWith(failure);
            expect(shown()).toEqual([]);
        });
    });

    describe('the flowers of the server', () => {
        test('one flower: the cards come from its files and the children from the server', async () => {
            addServerChildren(1, 2, 2);
            addServerChildren(3, 1, 1);
            addServerChildren(2, 3, 1);
            const { getDescendants } = await import('../../../src/services/flowerApiClient');
            await mountView('/Descendants/remote/1');

            expect(wrapper.get('.card').attributes('data-local')).toBe('false');
            expect(shown()).toEqual([3, 2, 1]);
            expect(getDescendants).toHaveBeenCalledWith(1, undefined, { limit: 3, offset: 0 });
        });

        test('a pair: the father first, and the child of a reproduction is at the top', async () => {
            addServerChildren(1, 2, 1);
            addServerChildren(2, 1, 1);
            await mountView('/Descendants/remote/1/2');
            expect(shown()).toEqual([1]);

            FlowerStore.selectRemoteFlower({ id: 1 });
            FlowerStore.selectRemoteFlower({ id: 2 });
            await FlowerStore.remoteReproduce();
            await settle();
            expect(shown()).toEqual([3, 1]);

            FlowerStore.selectRemoteFlower({ id: 2 });
            FlowerStore.selectRemoteFlower({ id: 3 });
            await FlowerStore.remoteReproduce();
            await settle();
            expect(shown()).toEqual([3, 1]);
            expect(await reopened('/Descendants/remote/1/2')).toEqual([3, 1]);
        });

        test('one flower: the child of a pair that has it is at the top, as father or as mother', async () => {
            await mountView('/Descendants/remote/2');

            for(const [father, mother] of [[1, 2], [2, 3], [3, 4]]){
                FlowerStore.selectRemoteFlower({ id: father });
                FlowerStore.selectRemoteFlower({ id: mother });
                await FlowerStore.remoteReproduce();
            }
            await settle();

            expect(shown()).toEqual([2, 1]);
            expect(await reopened('/Descendants/remote/2')).toEqual([2, 1]);
        });

        test('a server that is offline is not an error to show: the list is empty', async () => {
            addServerChildren(1, 2, 2);
            server.offline = true;

            await mountView('/Descendants/remote/1/2');

            expect(shown()).toEqual([]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });
    });

    describe('one page at a time', () => {
        beforeEach(() => {
            FlowerStore.settings.pagination = true;
        });
        const clickArrow = async (label) => {
            await wrapper.findAll('button').find((b) => b.text() === label).trigger('click');
            await settle();
        };

        test('local: starts at the page of the route, counts the pages, and the arrows do not push the route', async () => {
            await makeParents();
            addLocalChildren(1, 2, 7);
            await mountView('/Descendants/local/1/2?page=1');
            const route = router.currentRoute.value.fullPath;

            expect(shown()).toEqual([7, 6, 5]);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(3);

            await clickArrow('>');
            expect(shown()).toEqual([4]);
            await clickArrow('<');
            await clickArrow('<');
            expect(shown()).toEqual([10, 9, 8]);
            expect(router.currentRoute.value.fullPath).toBe(route);
        });

        test('a child is at the top of the page that is shown', async () => {
            await makeParents();
            addLocalChildren(1, 2, 4);
            await mountView('/Descendants/local/1');

            await reproduce(1, 2);

            expect(shown()).toEqual([8, 7, 6, 5]);
        });

        test('the server: counts its pages, and an offline server is reported once, by the count, and not as NaN pages', async () => {
            addServerChildren(1, 2, 5);
            await mountView('/Descendants/remote/1/2');
            expect(shown()).toEqual([5, 4, 3]);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(2);

            wrapper.unmount();
            server.offline = true;
            await mountView('/Descendants/remote/1/2');

            expect(shown()).toEqual([]);
            expect(ErrorStore.push).toHaveBeenCalledTimes(1);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(0);
        });
    });
});
