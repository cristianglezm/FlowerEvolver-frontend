// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import Mutations from '../../../src/views/Mutations.vue';
import PaginationOrInfiniteScroll from '../../../src/components/PaginationOrInfiniteScroll.vue';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useSettingsStore } from '../../../src/stores/SettingsStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { flowerAdded } from '../../../src/services/listEvents';

// The view with the real FlowerStore and the real wasm: the card of the flower, or one of the cards of the list,
// is mutated while the tab is on screen. A mutation is stored as a mutation of the flower that was mutated, so the
// tab of a flower shows its own mutations only, the same ones that it shows when it is read again.
// What is behind the store is faked: the tables of the browser, and the server.
const local = vi.hoisted(() => ({ flowers: [], mutations: [], seq: 0 }));
const server = vi.hoisted(() => ({ flowers: [], mutations: [], seq: 0, offline: false }));
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
    addMutation: vi.fn(async (entry) => { local.mutations.push({ ...entry }); }),
    countMutations: vi.fn(async (original) => local.mutations.filter((m) => m.original === original).length),
    listMutationsByOriginal: vi.fn(async ({ original, limit, offset }) => {
        return local.mutations.filter((m) => m.original === original).sort((a, b) => b.id - a.id).slice(offset, offset + limit);
    }),
    removeFavourite: vi.fn(async () => {}),
    deleteDescription: vi.fn(async () => {}),
    deleteDescendant: vi.fn(async () => {}),
    deleteFlower: vi.fn(async (id) => { local.flowers = local.flowers.filter((f) => f.id !== id); }),
    findMutationsByOriginalOrId: vi.fn(async () => []),
    bulkDeleteMutations: vi.fn(async () => {}),
    wipeDatabase: vi.fn(async () => { local.flowers = []; local.mutations = []; local.seq = 0; }),
}));
vi.mock('../../../src/services/flowerApiClient', () => {
    const reach = () => {
        if(server.offline){
            throw { response: undefined };
        }
    };
    return {
        API: 'http://test-api.local/',
        mapAxiosError: vi.fn((e, offlineMessage) => (e.response === undefined ? offlineMessage : e.response.data)),
        getMutations: vi.fn(async (original, { limit, offset }) => {
            reach();
            return server.mutations.filter((m) => m.original === original).sort((a, b) => b.id - a.id)
                .slice(offset, offset + limit).map((m) => server.flowers.find((f) => f.id === m.id));
        }),
        getMutationsCount: vi.fn(async (original) => {
            reach();
            return server.mutations.filter((m) => m.original === original).length;
        }),
        mutateRemote: vi.fn(async (original) => {
            reach();
            const id = ++server.seq;
            const flower = { id, genome: `${id}.json`, image: `${id}.png` };
            server.flowers.push(flower);
            server.mutations.push({ id, original });
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

describe('Mutations view', () => {
    let FlowerStore;
    let SettingsStore;
    let ErrorStore;
    let router;
    let wrapper;

    // a flower with a real genome, so that it can be mutated: it is the flower 1
    const makeOriginal = async () => {
        await FlowerStore.makeLocalFlower();
        return { ...local.flowers[0] };
    };
    // local flowers that are mutations of `original`, with the ids that follow
    const addLocalMutations = (original, count) => {
        const ids = [];
        for(let i = 0; i < count; ++i){
            const id = ++local.seq;
            local.flowers.push({ id, genome: 'g', image: 'i' });
            local.mutations.push({ id, original });
            ids.push(id);
        }
        return ids;
    };
    const mountView = async (path) => {
        await router.push(path);
        wrapper = mount(Mutations, { global: { plugins: [router] } });
        await flushPromises();
    };
    const shown = () => wrapper.findAll('.flowers li:not(.none)').map((li) => Number(li.text()));
    const settle = async () => {
        await flushPromises();
        await nextTick();
    };
    // what the tab of this flower shows when it is opened again
    const reopened = async (path) => {
        wrapper.unmount();
        await mountView(path);
        return shown();
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        local.flowers = [];
        local.mutations = [];
        local.seq = 0;
        server.flowers = [];
        server.mutations = [];
        server.seq = 0;
        server.offline = false;
        createTestingPinia({ stubActions: false, createSpy: vi.fn });
        FlowerStore = useFlowerStore();
        SettingsStore = useSettingsStore();
        ErrorStore = useErrorStore();
        vi.spyOn(ErrorStore, 'push');
        SettingsStore.settings.pagination = false;
        SettingsStore.settings.limit = 3;
        router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/Mutations/:isLocal/:id', name: 'Mutations', component: { template: '<div />' } }] });
    });

    afterEach(() => {
        wrapper?.unmount();
        wrapper = undefined;
    });

    describe('the flowers of this browser', () => {
        test('shows the card of the flower and its mutations, the newest first, a batch at a time', async () => {
            const original = await makeOriginal();
            addLocalMutations(original.id, 5);
            await mountView('/Mutations/local/1');

            expect(wrapper.get('.card').text()).toBe('1');
            expect(wrapper.get('.card').attributes('data-local')).toBe('true');
            expect(wrapper.get('.header').text()).toBe('Mutations of 1');
            expect(shown()).toEqual([6, 5, 4]);

            wrapper.findComponent(PaginationOrInfiniteScroll).vm.$emit('update-page');
            await settle();
            expect(shown()).toEqual([6, 5, 4, 3, 2]);
        });

        test('only the mutations of that flower, not those of its mutations or of other flowers', async () => {
            const original = await makeOriginal();
            const [first] = addLocalMutations(original.id, 1);
            addLocalMutations(first, 2);
            addLocalMutations(99, 1);
            await mountView('/Mutations/local/1');

            expect(shown()).toEqual([2]);
        });

        test('a mutation whose flower is gone is left out, the rest are shown', async () => {
            const original = await makeOriginal();
            addLocalMutations(original.id, 2);
            // the row of the table is still there, its flower is not
            local.mutations.push({ id: 99, original: original.id });
            await mountView('/Mutations/local/1');

            expect(shown()).toEqual([3, 2]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('says that the flower has no mutations', async () => {
            await makeOriginal();
            await mountView('/Mutations/local/1');

            expect(wrapper.get('.none').text()).toBe('This Flower Has no Mutations.');
        });

        test('a flower that is not there has no card, and its mutations are listed all the same', async () => {
            addLocalMutations(7, 2);
            await mountView('/Mutations/local/7');

            expect(wrapper.find('.card').exists()).toBe(false);
            expect(wrapper.get('.header').text()).toBe('Mutations of 7');
            expect(shown()).toEqual([2, 1]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        // the e2e spec 'create, mutate, and favourite a local flower', seen from this tab
        test('a mutation of the flower, made from its card, is at the top', async () => {
            const original = await makeOriginal();
            await mountView('/Mutations/local/1');
            expect(shown()).toEqual([]);

            await FlowerStore.makeLocalMutation(original);
            await settle();
            expect(shown()).toEqual([2]);
            await FlowerStore.makeLocalMutation(original);
            await settle();

            expect(shown()).toEqual([3, 2]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('a mutation of one of the mutations in the list is not in it: it is a mutation of that one', async () => {
            const original = await makeOriginal();
            await mountView('/Mutations/local/1');
            await FlowerStore.makeLocalMutation(original);
            await settle();
            const child = { ...local.flowers[1] };
            expect(shown()).toEqual([2]);

            await FlowerStore.makeLocalMutation(child);
            await settle();

            expect(shown()).toEqual([2]);
            expect(local.flowers).toHaveLength(3);
            // it is where the flower says it is
            expect(local.mutations).toEqual([{ id: 2, original: 1 }, { id: 3, original: 2 }]);
        });

        test('what is shown is what the tab shows when it is opened again, whatever was mutated', async () => {
            const original = await makeOriginal();
            await mountView('/Mutations/local/1');
            await FlowerStore.makeLocalMutation(original);
            await FlowerStore.makeLocalMutation({ ...local.flowers[1] });
            await FlowerStore.makeLocalMutation(original);
            await FlowerStore.makeLocalMutation({ ...local.flowers[3] });
            await settle();
            const live = shown();

            expect(await reopened('/Mutations/local/1')).toEqual(live);
            expect(live).toEqual([4, 2]);
            // and the mutation of the mutation is in the tab of the mutation
            expect(await reopened('/Mutations/local/2')).toEqual([3]);
        });

        test('a mutation of another flower is not its business', async () => {
            const original = await makeOriginal();
            await mountView('/Mutations/local/1');

            flowerAdded('localMutations', { id: 50, genome: 'g', image: 'i' }, { original: 2 });
            flowerAdded('localMutations', { id: 51, genome: 'g', image: 'i' });
            await settle();

            expect(shown()).toEqual([]);
            expect(original.id).toBe(1);
        });

        test('a mutation that is announced when it is in the list already is not shown twice', async () => {
            const original = await makeOriginal();
            const [id] = addLocalMutations(original.id, 1);
            await mountView('/Mutations/local/1');

            flowerAdded('localMutations', { id, genome: 'g', image: 'i' }, { original: 1 });
            await settle();

            expect(shown()).toEqual([2]);
        });

        test('the mutations of the server are not shown in it, nor in the tab of the server those of the browser', async () => {
            const original = await makeOriginal();
            await mountView('/Mutations/local/1');
            const { mutateRemote } = await import('../../../src/services/flowerApiClient');

            await FlowerStore.makeRemoteMutation({ id: 1 });
            await settle();
            expect(mutateRemote).toHaveBeenCalledWith(1);
            expect(shown()).toEqual([]);

            wrapper.unmount();
            await mountView('/Mutations/remote/1');
            await FlowerStore.makeLocalMutation(original);
            await settle();
            expect(shown()).toEqual([1]);
        });

        test('a mutation that is deleted goes away', async () => {
            const original = await makeOriginal();
            addLocalMutations(original.id, 3);
            await mountView('/Mutations/local/1');

            await FlowerStore.deleteLocalFlower(3);
            await settle();

            expect(shown()).toEqual([4, 2]);
        });

        test('deleting every flower leaves it empty', async () => {
            const original = await makeOriginal();
            addLocalMutations(original.id, 3);
            await mountView('/Mutations/local/1');

            await FlowerStore.deleteAllFlowers();
            await settle();

            expect(shown()).toEqual([]);
        });

        test('a table that cannot be read goes to the ErrorStore', async () => {
            const { listMutationsByOriginal } = await import('../../../src/services/flowerRepository');
            const failure = new Error('IndexedDB is closed');
            listMutationsByOriginal.mockRejectedValueOnce(failure);

            await mountView('/Mutations/local/1');

            expect(ErrorStore.push).toHaveBeenCalledWith(failure);
            expect(shown()).toEqual([]);
        });

        test('after the view is gone a mutation is not its business', async () => {
            const original = await makeOriginal();
            await mountView('/Mutations/local/1');
            wrapper.unmount();
            wrapper = undefined;

            await FlowerStore.makeLocalMutation(original);
            await flushPromises();

            expect(ErrorStore.push).not.toHaveBeenCalled();
        });
    });

    describe('the flowers of the server', () => {
        const addServerMutations = (original, count) => {
            for(let i = 0; i < count; ++i){
                const id = ++server.seq;
                server.flowers.push({ id, genome: `${id}.json`, image: `${id}.png` });
                server.mutations.push({ id, original });
            }
        };

        test('shows the card of the flower, from its files, and its mutations', async () => {
            addServerMutations(1, 4);
            await mountView('/Mutations/remote/1');

            expect(wrapper.get('.card').attributes('data-local')).toBe('false');
            expect(shown()).toEqual([4, 3, 2]);

            wrapper.findComponent(PaginationOrInfiniteScroll).vm.$emit('update-page');
            await settle();
            expect(shown()).toEqual([4, 3, 2, 1]);
        });

        test('a mutation of the flower is at the top and a mutation of one of its mutations is not', async () => {
            addServerMutations(1, 1);
            await mountView('/Mutations/remote/1');
            expect(shown()).toEqual([1]);

            await FlowerStore.makeRemoteMutation({ id: 1 });
            await settle();
            expect(shown()).toEqual([2, 1]);

            await FlowerStore.makeRemoteMutation({ id: 2 });
            await settle();
            expect(shown()).toEqual([2, 1]);
            expect(await reopened('/Mutations/remote/1')).toEqual([2, 1]);
        });

        test('a server that is offline is not an error to show: the list is empty', async () => {
            addServerMutations(1, 2);
            server.offline = true;

            await mountView('/Mutations/remote/1');

            expect(shown()).toEqual([]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });
    });

    describe('one page at a time', () => {
        beforeEach(() => {
            SettingsStore.settings.pagination = true;
        });
        const clickArrow = async (label) => {
            await wrapper.findAll('button').find((b) => b.text() === label).trigger('click');
            await settle();
        };

        test('local: starts at the page of the route, counts the pages, and the arrows do not push the route', async () => {
            const original = await makeOriginal();
            addLocalMutations(original.id, 7);
            await mountView('/Mutations/local/1?page=1');
            const route = router.currentRoute.value.fullPath;

            expect(shown()).toEqual([5, 4, 3]);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(3);

            await clickArrow('>');
            expect(shown()).toEqual([2]);
            await clickArrow('<');
            await clickArrow('<');
            expect(shown()).toEqual([8, 7, 6]);
            expect(router.currentRoute.value.fullPath).toBe(route);
        });

        test('a mutation of the flower is at the top of the page that is shown', async () => {
            const original = await makeOriginal();
            addLocalMutations(original.id, 4);
            await mountView('/Mutations/local/1');

            await FlowerStore.makeLocalMutation(original);
            await settle();

            expect(shown()).toEqual([6, 5, 4, 3]);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(2);
        });

        test('the server: counts its pages, and an offline server is reported once, by the count', async () => {
            for(let i = 0; i < 5; ++i){
                const id = ++server.seq;
                server.flowers.push({ id, genome: `${id}.json`, image: `${id}.png` });
                server.mutations.push({ id, original: 1 });
            }
            await mountView('/Mutations/remote/1');
            expect(shown()).toEqual([5, 4, 3]);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(2);

            wrapper.unmount();
            server.offline = true;
            await mountView('/Mutations/remote/1');

            expect(shown()).toEqual([]);
            expect(ErrorStore.push).toHaveBeenCalledTimes(1);
        });
    });
});
