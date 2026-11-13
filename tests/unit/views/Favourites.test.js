// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import Favourites from '../../../src/views/Favourites.vue';
import PaginationOrInfiniteScroll from '../../../src/components/PaginationOrInfiniteScroll.vue';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { flowerAdded } from '../../../src/services/listEvents';

// The view with the real FlowerStore: a card adds the flower to the favourites or takes it out, and a flower
// can be deleted, while the tab is on screen. Only what is behind the store is faked: the tables of the flowers and
// of the favourites (the favourites table has the id of the flower in each row, and is read the highest first).
const db = vi.hoisted(() => ({ flowers: [], favourites: new Set() }));
vi.mock('../../../src/services/flowerRepository', () => {
    const copy = (f) => (f === undefined ? undefined : { ...f });
    return {
        ensureOpen: vi.fn(),
        countFavourites: vi.fn(async () => db.favourites.size),
        listFavourites: vi.fn(async ({ limit, offset }) => {
            const ids = [...db.favourites].sort((a, b) => b - a).slice(offset, offset + limit);
            return ids.map((id) => copy(db.flowers.find((f) => f.id === id))).filter((f) => f !== undefined);
        }),
        getFlower: vi.fn(async (id) => copy(db.flowers.find((f) => f.id === id))),
        addFavourite: vi.fn(async (id) => {
            if(db.favourites.has(id)){
                throw new Error('already a favourite');
            }
            db.favourites.add(id);
            return id;
        }),
        removeFavourite: vi.fn(async (id) => { db.favourites.delete(id); }),
        deleteFlower: vi.fn(async (id) => { db.flowers = db.flowers.filter((f) => f.id !== id); }),
        deleteDescription: vi.fn(async () => {}),
        deleteDescendant: vi.fn(async () => {}),
        findMutationsByOriginalOrId: vi.fn(async () => []),
        bulkDeleteMutations: vi.fn(async () => {}),
        listFavouriteIds: vi.fn(async () => [...db.favourites].sort((a, b) => a - b)),
        bulkGetFlowers: vi.fn(async (ids) => ids.map((id) => copy(db.flowers.find((f) => f.id === id)))),
        bulkGetDescriptions: vi.fn(async (ids) => ids.map(() => undefined)),
        wipeDatabase: vi.fn(async () => { db.flowers = []; db.favourites = new Set(); }),
        bulkAddFlowers: vi.fn(async (flowers) => { db.flowers.push(...flowers.map(copy)); }),
        bulkAddFavourites: vi.fn(async (ids) => { ids.forEach((id) => db.favourites.add(id)); }),
        bulkAddDescriptions: vi.fn(async () => {}),
    };
});
vi.mock('../../../src/services/flowerApiClient', () => ({ API: 'http://test-api.local/', mapAxiosError: vi.fn((e) => e) }));
vi.mock('../../../src/services/speciesRepository', () => ({ bulkGetSpecies: vi.fn(async (ids) => ids.map(() => undefined)), bulkPutSpecies: vi.fn(async () => {}) }));
vi.mock('../../../src/stores/SpeciesStore', () => ({
    useSpeciesStore: () => ({ classifyLater: vi.fn(), removeFlower: vi.fn(async () => {}), invalidate: vi.fn() }),
}));
const captioner = vi.hoisted(() => ({ loadLocalDescriptions: vi.fn(), loadAndConcatLocalDescriptions: vi.fn() }));
vi.mock('../../../src/stores/CaptionerStore', () => ({ useCaptionerStore: () => captioner }));
vi.mock('../../../src/components/FlowersTable.vue', () => ({
    default: {
        props: ['flowers', 'isLocal', 'noFlowerMessage'],
        template: '<ul class="flowers"><li v-for="flower in flowers" :key="flower.id">{{ flower.id }}</li><li v-if="!flowers.length" class="none">{{ noFlowerMessage }}</li></ul>',
    },
}));

describe('Favourites view', () => {
    let FlowerStore;
    let ErrorStore;
    let router;
    let wrapper;

    // flowers 1..count, and these ids of them are favourites
    const fill = (count, favourites) => {
        db.flowers = Array.from({ length: count }, (_, i) => ({ id: i + 1, genome: 'g', image: 'i' }));
        db.favourites = new Set(favourites);
    };
    const mountView = async (path = '/Favourites') => {
        await router.push(path);
        wrapper = mount(Favourites, { global: { plugins: [router] } });
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
        db.flowers = [];
        db.favourites = new Set();
        createTestingPinia({ stubActions: false, createSpy: vi.fn });
        FlowerStore = useFlowerStore();
        ErrorStore = useErrorStore();
        vi.spyOn(ErrorStore, 'push');
        FlowerStore.settings.pagination = false;
        FlowerStore.settings.limit = 3;
        router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/Favourites', name: 'Favourites', component: { template: '<div />' } }] });
    });

    afterEach(() => {
        wrapper?.unmount();
        wrapper = undefined;
    });

    describe('infinite scroll', () => {
        test('shows the favourites, the highest id first, a batch at a time, and only them', async () => {
            fill(10, [2, 3, 5, 6, 8, 9, 10]);
            await mountView();
            expect(shown()).toEqual([10, 9, 8]);

            wrapper.findComponent(PaginationOrInfiniteScroll).vm.$emit('update-page');
            await settle();

            expect(shown()).toEqual([10, 9, 8, 6, 5, 3]);
        });

        test('the descriptions of a batch are added to those of the batches before, not put in their place', async () => {
            fill(10, [1, 2, 3, 4, 5, 6, 7]);
            await mountView();
            expect(captioner.loadLocalDescriptions).toHaveBeenCalledExactlyOnceWith(0, 3);

            wrapper.findComponent(PaginationOrInfiniteScroll).vm.$emit('update-page');
            await settle();

            expect(captioner.loadAndConcatLocalDescriptions).toHaveBeenCalledExactlyOnceWith(3, 3);
            expect(captioner.loadLocalDescriptions).toHaveBeenCalledTimes(1);
        });

        test('says that there are no favourites', async () => {
            fill(3, []);
            await mountView();

            expect(wrapper.get('.none').text()).toBe("You don't have favourites.");
        });

        // the e2e spec 'create, mutate, and favourite a local flower', seen from this tab
        test('a flower that a card makes a favourite is at the top, and goes away when it is not one any more', async () => {
            fill(5, [1]);
            await mountView();
            expect(shown()).toEqual([1]);

            await FlowerStore.addFlowerToFav(4);
            await vi.waitFor(() => expect(shown()).toEqual([4, 1]));

            FlowerStore.removeFlowerFromFav(1);
            await settle();
            expect(shown()).toEqual([4]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('a flower that cannot be made a favourite says so and is not shown', async () => {
            fill(3, [1]);
            await mountView();

            await FlowerStore.addFlowerToFav(1);
            await settle();

            expect(shown()).toEqual([1]);
            expect(ErrorStore.push).toHaveBeenCalledTimes(1);
        });

        test('a flower that is deleted goes away', async () => {
            fill(5, [2, 3, 4]);
            await mountView();

            await FlowerStore.deleteLocalFlower(3);
            await settle();

            expect(shown()).toEqual([4, 2]);
        });

        test('deleting every flower leaves it empty', async () => {
            fill(5, [2, 3, 4]);
            await mountView();

            await FlowerStore.deleteAllFlowers();
            await settle();

            expect(shown()).toEqual([]);
            expect(wrapper.find('.none').exists()).toBe(true);
        });

        test('deleting the flowers that are not favourites leaves the favourites, with the ids they have then', async () => {
            fill(5, [2, 4, 5]);
            await mountView();
            expect(shown()).toEqual([5, 4, 2]);

            await FlowerStore.deleteNonFavourites();
            await settle();

            // the three flowers are 1, 2 and 3 now, and all of them are favourites
            expect(shown()).toEqual([3, 2, 1]);
        });

        test('a flower that is announced when it is in the list already is not shown twice', async () => {
            fill(3, [1, 2]);
            await mountView();

            flowerAdded('favourites', { id: 2, genome: 'g', image: 'i' });
            await settle();

            expect(shown()).toEqual([2, 1]);
        });

        test('after the view is gone what happens to the favourites is not its business', async () => {
            fill(3, [1]);
            await mountView();
            wrapper.unmount();
            wrapper = undefined;

            await FlowerStore.addFlowerToFav(2);
            await flushPromises();

            expect(ErrorStore.push).not.toHaveBeenCalled();
        });
    });

    describe('one page at a time', () => {
        beforeEach(() => {
            FlowerStore.settings.pagination = true;
            fill(12, [1, 3, 4, 6, 7, 9, 10, 12]);
        });
        const clickArrow = async (label) => {
            await wrapper.findAll('button').find((b) => b.text() === label).trigger('click');
            await settle();
        };

        test('starts at the page of the route and counts the pages of the favourites', async () => {
            await mountView('/Favourites?page=1');

            expect(shown()).toEqual([7, 6, 4]);
            expect(wrapper.findComponent(PaginationOrInfiniteScroll).props('totalPages')).toBe(3);
        });

        test('the arrows move one page, in place, and each page takes the place of the descriptions of the one before', async () => {
            await mountView();
            const route = router.currentRoute.value.fullPath;

            await clickArrow('>');
            await clickArrow('>');
            expect(shown()).toEqual([3, 1]);
            await clickArrow('<');
            expect(shown()).toEqual([7, 6, 4]);

            expect(router.currentRoute.value.fullPath).toBe(route);
            expect(captioner.loadAndConcatLocalDescriptions).not.toHaveBeenCalled();
            expect(captioner.loadLocalDescriptions.mock.calls).toEqual([[0, 3], [3, 3], [6, 3], [3, 3]]);
        });
    });
});
