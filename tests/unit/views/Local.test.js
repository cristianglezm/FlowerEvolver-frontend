// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import Local from '../../../src/views/Local.vue';
import PaginationOrInfiniteScroll from '../../../src/components/PaginationOrInfiniteScroll.vue';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { flowerAdded } from '../../../src/services/listEvents';

// What is under test is the view with the real FlowerStore and the real wasm, the way the e2e specs use it: a
// flower is made, mutated, reproduced or deleted by the menu or a card while the Local tab is on screen, and the
// tab has to show it. Only what is behind them is faked: the table of flowers (it behaves like the Dexie one,
// the newest first), the network, the species and the descriptions.
const table = vi.hoisted(() => ({ rows: [], seq: 0 }));
vi.mock('../../../src/services/flowerRepository', () => {
    const bySeq = (id) => table.rows.find((f) => f.id === id);
    return {
        ensureOpen: vi.fn(),
        countFlowers: vi.fn(async () => table.rows.length),
        listFlowers: vi.fn(async ({ limit, offset }) => [...table.rows].reverse().slice(offset, offset + limit)),
        addFlower: vi.fn(async (flower) => {
            const id = ++table.seq;
            table.rows.push({ ...flower, id });
            return id;
        }),
        getFlower: vi.fn(async (id) => bySeq(id)),
        deleteFlower: vi.fn(async (id) => { table.rows = table.rows.filter((f) => f.id !== id); }),
        wipeDatabase: vi.fn(async () => { table.rows = []; table.seq = 0; }),
        removeFavourite: vi.fn(async () => {}),
        deleteDescription: vi.fn(async () => {}),
        deleteDescendant: vi.fn(async () => {}),
        findMutationsByOriginalOrId: vi.fn(async () => []),
        bulkDeleteMutations: vi.fn(async () => {}),
        addMutation: vi.fn(async () => {}),
        addDescendant: vi.fn(async () => {}),
        listFavouriteIds: vi.fn(async () => []),
        bulkGetFlowers: vi.fn(async () => []),
        bulkAddFlowers: vi.fn(async () => {}),
        bulkAddFavourites: vi.fn(async () => {}),
        bulkGetDescriptions: vi.fn(async () => []),
        bulkAddDescriptions: vi.fn(async () => {}),
    };
});
vi.mock('../../../src/services/flowerApiClient', () => ({ API: 'http://test-api.local/', mapAxiosError: vi.fn((e) => e) }));
vi.mock('../../../src/services/speciesRepository', () => ({ bulkGetSpecies: vi.fn(async () => []), bulkPutSpecies: vi.fn(async () => {}) }));
vi.mock('../../../src/stores/SpeciesStore', () => ({
    useSpeciesStore: () => ({ classifyLater: vi.fn(), removeFlower: vi.fn(async () => {}), invalidate: vi.fn() }),
}));
const captioner = vi.hoisted(() => ({ loadLocalDescriptions: vi.fn(), loadAndConcatLocalDescriptions: vi.fn() }));
vi.mock('../../../src/stores/CaptionerStore', () => ({ useCaptionerStore: () => captioner }));
// a flower card is a lot of components and stores, the view only hands it the flowers
vi.mock('../../../src/components/FlowersTable.vue', () => ({
    default: {
        props: ['flowers', 'isLocal', 'noFlowerMessage'],
        template: '<ul class="flowers"><li v-for="flower in flowers" :key="flower.id">{{ flower.id }}</li><li v-if="!flowers.length" class="none">{{ noFlowerMessage }}</li></ul>',
    },
}));
const workers = vi.hoisted(() => []);
// the module of a worker is called as a function, not with new
vi.mock('../../../src/workers/import.worker?worker', () => ({
    default: () => {
        const worker = { postMessage: vi.fn(), terminate: vi.fn() };
        workers.push(worker);
        return worker;
    },
}));

const page = { template: '<div />' };

describe('Local view', () => {
    let FlowerStore;
    let ErrorStore;
    let router;
    let emitter;
    let wrapper;

    const addRows = (count) => {
        for(let i = 0; i < count; ++i){
            table.rows.push({ id: ++table.seq, genome: 'g', image: 'i' });
        }
    };
    const mountView = async (path = '/Local') => {
        await router.push(path);
        wrapper = mount(Local, { global: { plugins: [router], provide: { emitter } } });
        await flushPromises();
        return wrapper;
    };
    const shown = () => wrapper.findAll('.flowers li:not(.none)').map((li) => Number(li.text()));
    const settle = async () => {
        await flushPromises();
        await nextTick();
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        table.rows = [];
        table.seq = 0;
        workers.length = 0;
        emitter = { emit: vi.fn() };
        createTestingPinia({ stubActions: false, createSpy: vi.fn });
        FlowerStore = useFlowerStore();
        ErrorStore = useErrorStore();
        vi.spyOn(ErrorStore, 'push');
        FlowerStore.settings.loadDemoFlowers = false;
        FlowerStore.settings.pagination = false;
        FlowerStore.settings.limit = 3;
        router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/Local', name: 'Local', component: page }] });
    });

    afterEach(() => {
        wrapper?.unmount();
        wrapper = undefined;
    });

    describe('infinite scroll', () => {
        test('shows the newest flowers first, a batch at a time, and loads their descriptions', async () => {
            addRows(7);
            await mountView();

            expect(shown()).toEqual([7, 6, 5]);
            expect(captioner.loadLocalDescriptions).toHaveBeenCalledExactlyOnceWith(0, 3);

            wrapper.findComponent(PaginationOrInfiniteScroll).vm.$emit('update-page');
            await settle();

            expect(shown()).toEqual([7, 6, 5, 4, 3, 2]);
            // the next batch adds to the descriptions, it does not take the ones of the first away
            expect(captioner.loadAndConcatLocalDescriptions).toHaveBeenCalledExactlyOnceWith(3, 3);
            expect(captioner.loadLocalDescriptions).toHaveBeenCalledTimes(1);
        });

        test('says that there are no flowers', async () => {
            await mountView();

            expect(wrapper.get('.none').text()).toBe('There are no Flowers');
        });

        // the e2e spec 'create, mutate, and favourite a local flower'
        test('a flower that the menu makes is at the top, and so is its mutation', async () => {
            await mountView();

            await FlowerStore.makeLocalFlower();
            await settle();
            expect(shown()).toEqual([1]);

            await FlowerStore.makeLocalMutation(table.rows[0]);
            await settle();
            expect(shown()).toEqual([2, 1]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        // the e2e spec 'selecting two local flowers enables reproduction'
        test('the child of two selected flowers is at the top', async () => {
            await mountView();
            await FlowerStore.makeLocalFlower();
            await FlowerStore.makeLocalFlower();
            await settle();
            expect(shown()).toEqual([2, 1]);

            FlowerStore.selectLocalFlower({ id: 1 });
            FlowerStore.selectLocalFlower({ id: 2 });
            await FlowerStore.localReproduce();
            await settle();

            expect(shown()).toEqual([3, 2, 1]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('a redrawn copy is at the top with its own id', async () => {
            await mountView();
            await FlowerStore.makeLocalFlower();
            await settle();

            await FlowerStore.redrawFlower({ ...table.rows[0] });
            await settle();

            expect(shown()).toEqual([2, 1]);
        });

        test('a flower that is deleted goes away, the others stay', async () => {
            addRows(3);
            await mountView();

            await FlowerStore.deleteLocalFlower(2);
            await settle();

            expect(shown()).toEqual([3, 1]);
        });

        test('deleting every flower leaves it empty, and a flower made after that is the first again', async () => {
            addRows(3);
            await mountView();

            await FlowerStore.deleteAllFlowers();
            await settle();
            expect(shown()).toEqual([]);
            expect(wrapper.find('.none').exists()).toBe(true);

            await FlowerStore.makeLocalFlower();
            await settle();
            expect(shown()).toEqual([1]);
        });

        test('what is left after deleting the flowers that are not favourites is read again, with the new ids', async () => {
            addRows(5);
            await mountView();
            expect(shown()).toEqual([5, 4, 3]);

            // the favourite is the flower 4, it is written again as the flower 1
            const { listFavouriteIds, bulkGetFlowers, bulkAddFlowers } = await import('../../../src/services/flowerRepository');
            listFavouriteIds.mockResolvedValueOnce([4]);
            bulkGetFlowers.mockResolvedValueOnce([{ id: 4, genome: 'g', image: 'i' }]);
            bulkAddFlowers.mockImplementationOnce(async (flowers) => {
                table.seq = 0;
                flowers.forEach((f) => table.rows.push({ ...f, id: ++table.seq }));
            });
            await FlowerStore.deleteNonFavourites();
            await settle();

            expect(shown()).toEqual([1]);
        });

        // the race of the plan's 7.2: the Local tab is opened while the child is on its way
        test('a flower that is announced after the list was read with it in is not shown twice', async () => {
            addRows(2);
            await mountView();

            flowerAdded('local', table.rows[1]);
            await settle();

            expect(shown()).toEqual([2, 1]);
        });

        test('after the view is gone a flower that is made is not its business', async () => {
            await mountView();
            wrapper.unmount();
            wrapper = undefined;

            await FlowerStore.makeLocalFlower();
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

        test('starts at the page of the route, counts the pages, and each page replaces the descriptions', async () => {
            await mountView('/Local?page=1');

            expect(shown()).toEqual([5, 4, 3]);
            expect(captioner.loadLocalDescriptions).toHaveBeenCalledExactlyOnceWith(3, 3);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(3);
        });

        test('starts at the first page when the route has no page, or not a number', async () => {
            await mountView('/Local?page=abc');

            expect(shown()).toEqual([8, 7, 6]);
        });

        test('the arrows move one page, in place: the route is not pushed again', async () => {
            await mountView();
            const route = router.currentRoute.value.fullPath;

            await clickArrow('>');
            expect(shown()).toEqual([5, 4, 3]);
            await clickArrow('>');
            expect(shown()).toEqual([2, 1]);
            await clickArrow('<');
            expect(shown()).toEqual([5, 4, 3]);

            expect(router.currentRoute.value.fullPath).toBe(route);
            expect(captioner.loadAndConcatLocalDescriptions).not.toHaveBeenCalled();
            expect(captioner.loadLocalDescriptions.mock.calls).toEqual([[0, 3], [3, 3], [6, 3], [3, 3]]);
        });

        test('a flower that is made is at the top of the page that is shown', async () => {
            await mountView();

            await FlowerStore.makeLocalFlower();
            await settle();

            expect(shown()).toEqual([9, 8, 7, 6]);
        });
    });

    describe('the demo flowers', () => {
        test('what the worker imported is shown when it says it is done', async () => {
            FlowerStore.settings.loadDemoFlowers = true;
            vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob(['[]']) })));
            await mountView();
            expect(shown()).toEqual([]);
            expect(workers[0].postMessage).toHaveBeenCalledTimes(1);
            expect(FlowerStore.settings.loadDemoFlowers).toBe(false);

            addRows(4);
            workers[0].onmessage({ data: { type: 'done' } });
            await settle();

            expect(shown()).toEqual([4, 3, 2]);
            expect(workers[0].terminate).toHaveBeenCalled();
            vi.unstubAllGlobals();
        });

        test('the pages are counted again, the import added to them', async () => {
            FlowerStore.settings.pagination = true;
            FlowerStore.settings.loadDemoFlowers = true;
            vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob(['[]']) })));
            await mountView();
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(0);

            addRows(7);
            workers[0].onmessage({ data: { type: 'done' } });
            await settle();

            expect(shown()).toEqual([7, 6, 5]);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(3);
            vi.unstubAllGlobals();
        });

        test('the progress of the import is shown through the emitter', async () => {
            FlowerStore.settings.loadDemoFlowers = true;
            vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob(['[]']) })));
            await mountView();

            workers[0].onmessage({ data: { type: 'showProgress', title: 'importing', total: 42 } });
            workers[0].onmessage({ data: { type: 'updateProgress', progress: 7 } });

            expect(emitter.emit).toHaveBeenCalledWith('showProgress', expect.objectContaining({ title: 'importing', total: 42 }));
            expect(emitter.emit).toHaveBeenCalledWith('updateProgress', { progress: 7 });
            vi.unstubAllGlobals();
        });

        test('without them to load the worker is not kept', async () => {
            await mountView();

            expect(workers[0].terminate).toHaveBeenCalled();
        });
    });

    test('a table that cannot be read goes to the ErrorStore and the view stays empty', async () => {
        const { listFlowers } = await import('../../../src/services/flowerRepository');
        const failure = new Error('IndexedDB is closed');
        listFlowers.mockRejectedValueOnce(failure);

        await mountView();

        expect(ErrorStore.push).toHaveBeenCalledWith(failure);
        expect(shown()).toEqual([]);
    });
});
