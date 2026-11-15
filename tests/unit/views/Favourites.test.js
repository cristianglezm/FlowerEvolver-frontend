// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import Favourites from '../../../src/views/Favourites.vue';
import PaginationOrInfiniteScroll from '../../../src/components/PaginationOrInfiniteScroll.vue';
import { useLocalFlowerStore } from '../../../src/stores/LocalFlowerStore';
import { useFavouritesStore } from '../../../src/stores/FavouritesStore';
import { useSettingsStore } from '../../../src/stores/SettingsStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { flowerAdded } from '../../../src/services/listEvents';

// The view with the real LocalFlowerStore: a card adds the flower to the favourites or takes it out, and a flower
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
// the species of the flowers that are shown is asked for through ensureFor, which is what these tests look at
const speciesStore = vi.hoisted(() => ({
    classifyLater: vi.fn(), removeFlower: vi.fn(async () => {}), invalidate: vi.fn(), ensureFor: vi.fn(async () => {}),
}));
vi.mock('../../../src/stores/SpeciesStore', () => ({ useSpeciesStore: () => speciesStore }));
// the descriptions of the flowers that are shown are asked for by id
const captioner = vi.hoisted(() => ({ loadLocalDescriptionsOf: vi.fn(async () => {}) }));
vi.mock('../../../src/stores/CaptionerStore', () => ({ useCaptionerStore: () => captioner }));
vi.mock('../../../src/components/FlowersTable.vue', () => ({
    default: {
        props: ['flowers', 'isLocal', 'noFlowerMessage'],
        template: '<ul class="flowers"><li v-for="flower in flowers" :key="flower.id">{{ flower.id }}</li><li v-if="!flowers.length" class="none">{{ noFlowerMessage }}</li></ul>',
    },
}));

describe('Favourites view', () => {
    let LocalFlowerStore;
    let FavouritesStore;
    let SettingsStore;
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
    // the ids that the species were asked for, in order, batch after batch
    const askedFor = () => speciesStore.ensureFor.mock.calls.flatMap(([ids]) => ids);
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
        LocalFlowerStore = useLocalFlowerStore();
        FavouritesStore = useFavouritesStore();
        SettingsStore = useSettingsStore();
        ErrorStore = useErrorStore();
        vi.spyOn(ErrorStore, 'push');
        SettingsStore.settings.pagination = false;
        SettingsStore.settings.limit = 3;
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

        test('asks for the descriptions of the favourites that are shown, not of the flowers that are in their place in the table', async () => {
            // the favourites are not the first flowers of the table, and the table of descriptions is not theirs
            fill(10, [2, 5, 9]);
            await mountView();
            expect(captioner.loadLocalDescriptionsOf.mock.calls).toEqual([[[9, 5, 2]]]);
        });

        test('asks for the descriptions of each batch, the ones that were not asked for yet', async () => {
            fill(10, [1, 2, 3, 4, 5, 6, 7]);
            await mountView();
            expect(captioner.loadLocalDescriptionsOf.mock.calls).toEqual([[[7, 6, 5]]]);

            wrapper.findComponent(PaginationOrInfiniteScroll).vm.$emit('update-page');
            await settle();

            expect(captioner.loadLocalDescriptionsOf.mock.calls).toEqual([[[7, 6, 5]], [[4, 3, 2]]]);
        });

        test('asks for the species of each batch when it is shown, and only of that batch', async () => {
            fill(10, [2, 3, 5, 6, 8, 9, 10]);
            await mountView();
            expect(speciesStore.ensureFor.mock.calls).toEqual([[[10, 9, 8]]]);

            wrapper.findComponent(PaginationOrInfiniteScroll).vm.$emit('update-page');
            await settle();

            expect(speciesStore.ensureFor.mock.calls).toEqual([[[10, 9, 8]], [[6, 5, 3]]]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('does not ask for the species of a flower that is made a favourite, it was shown before', async () => {
            fill(5, [1]);
            await mountView();
            expect(askedFor()).toEqual([1]);

            await FavouritesStore.addFlowerToFav(4);
            await vi.waitFor(() => expect(shown()).toEqual([4, 1]));

            expect(askedFor()).toEqual([1]);
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

            await FavouritesStore.addFlowerToFav(4);
            await vi.waitFor(() => expect(shown()).toEqual([4, 1]));

            FavouritesStore.removeFlowerFromFav(1);
            await settle();
            expect(shown()).toEqual([4]);
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('a flower that cannot be made a favourite says so and is not shown', async () => {
            fill(3, [1]);
            await mountView();

            await FavouritesStore.addFlowerToFav(1);
            await settle();

            expect(shown()).toEqual([1]);
            expect(ErrorStore.push).toHaveBeenCalledTimes(1);
        });

        test('a flower that is deleted goes away', async () => {
            fill(5, [2, 3, 4]);
            await mountView();

            await LocalFlowerStore.deleteLocalFlower(3);
            await settle();

            expect(shown()).toEqual([4, 2]);
        });

        test('deleting every flower leaves it empty', async () => {
            fill(5, [2, 3, 4]);
            await mountView();

            await LocalFlowerStore.deleteAllFlowers();
            await settle();

            expect(shown()).toEqual([]);
            expect(wrapper.find('.none').exists()).toBe(true);
        });

        test('deleting the flowers that are not favourites leaves the favourites, with the ids they have then', async () => {
            fill(5, [2, 4, 5]);
            await mountView();
            expect(shown()).toEqual([5, 4, 2]);

            await LocalFlowerStore.deleteNonFavourites();
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

            await FavouritesStore.addFlowerToFav(2);
            await flushPromises();

            expect(ErrorStore.push).not.toHaveBeenCalled();
        });
    });

    describe('one page at a time', () => {
        beforeEach(() => {
            SettingsStore.settings.pagination = true;
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

        test('asks for the species of each page when it is shown, and again when it is shown again', async () => {
            await mountView();
            await clickArrow('>');
            await clickArrow('<');

            expect(speciesStore.ensureFor.mock.calls).toEqual([[[12, 10, 9]], [[7, 6, 4]], [[12, 10, 9]]]);
        });

        test('the arrows move one page, in place, and the address has the page, so the back button shows the page before', async () => {
            await mountView();
            const address = () => router.currentRoute.value.fullPath;
            const view = wrapper.vm;
            expect(address()).toBe('/Favourites');

            await clickArrow('>');
            expect(address()).toBe('/Favourites?page=1');
            await clickArrow('>');
            expect(shown()).toEqual([3, 1]);
            expect(address()).toBe('/Favourites?page=2');

            router.back();
            await vi.waitFor(() => expect(shown()).toEqual([7, 6, 4]));
            router.back();
            await vi.waitFor(() => expect(shown()).toEqual([12, 10, 9]));
            expect(address()).toBe('/Favourites');
            expect(wrapper.vm).toBe(view);
        });

        test('the arrows move one page, in place, and each page has the descriptions of its own flowers asked for', async () => {
            await mountView();

            await clickArrow('>');
            await clickArrow('>');
            expect(shown()).toEqual([3, 1]);
            await clickArrow('<');
            expect(shown()).toEqual([7, 6, 4]);

            expect(captioner.loadLocalDescriptionsOf.mock.calls).toEqual([[[12, 10, 9]], [[7, 6, 4]], [[3, 1]], [[7, 6, 4]]]);
        });
    });
});
