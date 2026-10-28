import { describe, test, expect, beforeEach, vi } from 'vitest';
import { reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { usePaginatedList } from '../../../src/composables/usePaginatedList';
import { useErrorStore } from '../../../src/stores/ErrorStore';

// The settings are the only thing it takes from FlowerStore, the rest of that store needs the wasm.
const flowerStore = vi.hoisted(() => ({}));
vi.mock('../../../src/stores/FlowerStore', () => ({
    useFlowerStore: () => flowerStore,
}));

const gate = () => {
    let open;
    let fail;
    const promise = new Promise((resolve, reject) => {
        open = resolve;
        fail = reject;
    });
    return { promise, open, fail };
};
// items are numbers, page p holds the numbers p * limit + 1 ... (p + 1) * limit, up to the count
const makeList = (count) => {
    const fetchPage = vi.fn(async ({ limit, offset }) => {
        return Array.from({ length: Math.max(0, Math.min(limit, count - offset)) }, (_, i) => offset + i + 1);
    });
    const fetchCount = vi.fn(async () => count);
    return { fetchPage, fetchCount };
};

describe('usePaginatedList', () => {
    let ErrorStore;

    beforeEach(() => {
        createTestingPinia({ stubActions: false, createSpy: vi.fn });
        ErrorStore = useErrorStore();
        flowerStore.settings = reactive({ pagination: true, limit: 10 });
        flowerStore.calcOffset = (page) => page * flowerStore.settings.limit;
        flowerStore.increaseOffset = (offset) => offset + flowerStore.settings.limit;
    });

    describe('one page at a time', () => {
        test('init shows the page it is told to and counts the pages', async () => {
            const { fetchPage, fetchCount } = makeList(35);
            const list = usePaginatedList({ fetchCount, fetchPage });

            await list.init(2);

            expect(list.isPaginated.value).toBe(true);
            expect(fetchPage).toHaveBeenCalledWith({ limit: 10, offset: 20 });
            expect(list.state.items).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
            expect(list.state.page).toBe(2);
            expect(list.state.totalPages).toBe(4);
        });

        test.each([
            [0, 0],
            [1, 1],
            [10, 1],
            [11, 2],
            [20, 2],
            [25, 3],
        ])('%i items make %i pages', async (count, pages) => {
            const list = usePaginatedList(makeList(count));
            await list.init();
            expect(list.state.totalPages).toBe(pages);
        });

        test('nextPage and prevPage move one page and stop at the ends', async () => {
            const list = usePaginatedList(makeList(25));
            await list.init();

            await list.prevPage();
            expect(list.state.page).toBe(0);

            await list.nextPage();
            expect(list.state.page).toBe(1);
            expect(list.state.items[0]).toBe(11);

            await list.nextPage();
            expect(list.state.page).toBe(2);
            expect(list.state.items).toEqual([21, 22, 23, 24, 25]);

            await list.nextPage();
            expect(list.state.page).toBe(2);

            await list.prevPage();
            expect(list.state.page).toBe(1);
        });

        test('a page that arrives after a newer one was asked for is not shown', async () => {
            // next is pressed and, before page 2 is here, previous
            const slow = gate();
            const fetchPage = vi.fn(async ({ offset }) => {
                if(offset === 20){
                    await slow.promise;
                }
                return [offset];
            });
            const list = usePaginatedList({ fetchCount: async () => 30, fetchPage });
            await list.init(1);

            const toNext = list.nextPage();
            await vi.waitFor(() => expect(fetchPage).toHaveBeenCalledWith({ limit: 10, offset: 20 }));
            await list.prevPage();
            slow.open();
            await toNext;

            expect(list.state.page).toBe(0);
            expect(list.state.items).toEqual([0]);
        });

        test('a page that cannot be read is reported and the list stays as it was', async () => {
            const { fetchPage, fetchCount } = makeList(30);
            const list = usePaginatedList({ fetchCount, fetchPage });
            await list.init();
            const failure = new Error('disk failure');
            fetchPage.mockRejectedValueOnce(failure);

            await list.nextPage();

            expect(ErrorStore.push).toHaveBeenCalledWith(failure);
            expect(list.state.page).toBe(0);
            expect(list.state.items[0]).toBe(1);
        });

        test('init starts over, the state of the previous list is gone', async () => {
            const list = usePaginatedList(makeList(30));
            await list.init();
            await list.nextPage();

            await list.init();

            expect(list.state.page).toBe(0);
            expect(list.state.items[0]).toBe(1);
        });
    });

    describe('infinite scroll', () => {
        beforeEach(() => {
            flowerStore.settings.pagination = false;
        });

        test('init loads the first batch and does not count', async () => {
            const { fetchPage, fetchCount } = makeList(25);
            const list = usePaginatedList({ fetchCount, fetchPage });

            await list.init();

            expect(list.isPaginated.value).toBe(false);
            expect(fetchCount).not.toHaveBeenCalled();
            expect(list.state.items).toHaveLength(10);
            expect(list.state.offset).toBe(10);
        });

        test('nextBatch adds the next batch to the items, until there is nothing left', async () => {
            const list = usePaginatedList(makeList(25));
            await list.init();

            await list.nextBatch();
            await list.nextBatch();
            await list.nextBatch();

            expect(list.state.items).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
        });

        test('works without init', async () => {
            const list = usePaginatedList(makeList(25));
            await list.nextBatch();
            expect(list.state.items).toHaveLength(10);
        });

        test('scrolling again while a batch is loading does not load it twice', async () => {
            const hold = gate();
            const fetchPage = vi.fn(async ({ offset }) => {
                if(offset === 10){
                    await hold.promise;
                }
                return [offset + 1];
            });
            const list = usePaginatedList({ fetchCount: async () => 99, fetchPage });
            await list.init();

            const first = list.nextBatch();
            list.nextBatch();
            list.nextBatch();
            hold.open();
            await first;

            expect(fetchPage.mock.calls.map(([args]) => args.offset)).toEqual([0, 10]);
            expect(list.state.items).toEqual([1, 11]);

            await list.nextBatch();
            expect(fetchPage.mock.calls.map(([args]) => args.offset)).toEqual([0, 10, 20]);
        });

        test('a batch that cannot be read is reported, and asked for again by the next scroll', async () => {
            const { fetchPage, fetchCount } = makeList(30);
            const list = usePaginatedList({ fetchCount, fetchPage });
            await list.init();
            const failure = new Error('disk failure');
            fetchPage.mockRejectedValueOnce(failure);

            await list.nextBatch();
            expect(ErrorStore.push).toHaveBeenCalledWith(failure);
            expect(list.state.items).toHaveLength(10);

            await list.nextBatch();
            expect(fetchPage).toHaveBeenLastCalledWith({ limit: 10, offset: 10 });
            expect(list.state.items).toHaveLength(20);
        });

        test('a batch that arrives after init started over is not added to the new list', async () => {
            const hold = gate();
            let slow = true;
            const fetchPage = vi.fn(async ({ offset }) => {
                if(slow && offset === 10){
                    await hold.promise;
                }
                return [`from ${offset}`];
            });
            const list = usePaginatedList({ fetchCount: async () => 99, fetchPage });
            await list.init();
            const old = list.nextBatch();
            await vi.waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));

            slow = false;
            await list.init();
            hold.open();
            await old;

            expect(list.state.items).toEqual(['from 0']);
            expect(list.state.offset).toBe(10);
        });
    });

    test('follows the settings: the same list is paginated or not as they say when it starts', async () => {
        const list = usePaginatedList(makeList(25));
        expect(list.isPaginated.value).toBe(true);

        flowerStore.settings.pagination = false;
        expect(list.isPaginated.value).toBe(false);
    });
});
