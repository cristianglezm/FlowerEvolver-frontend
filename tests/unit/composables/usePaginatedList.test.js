import { describe, test, expect, beforeEach, vi } from 'vitest';
import { reactive, effectScope } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { usePaginatedList } from '../../../src/composables/usePaginatedList';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { flowerAdded, flowerRemoved, listReset } from '../../../src/services/listEvents';

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

    // flowers: { id } objects, page p holds the ids p * limit + 1 ...
    const makeFlowers = (count) => {
        const fetchPage = vi.fn(async ({ limit, offset }) => {
            return Array.from({ length: Math.max(0, Math.min(limit, count - offset)) }, (_, i) => ({ id: offset + i + 1 }));
        });
        return { fetchPage, fetchCount: vi.fn(async () => count) };
    };
    const ids = (list) => list.state.items.map((f) => f.id);

    describe('onLoaded', () => {
        test('is told about a page, with where it starts and that it starts the list', async () => {
            const onLoaded = vi.fn();
            const list = usePaginatedList({ ...makeFlowers(35), onLoaded });

            await list.init(2);

            expect(onLoaded).toHaveBeenCalledExactlyOnceWith({
                items: [{ id: 21 }, { id: 22 }, { id: 23 }, { id: 24 }, { id: 25 }, { id: 26 }, { id: 27 }, { id: 28 }, { id: 29 }, { id: 30 }],
                offset: 20, limit: 10, append: false,
            });
        });

        test('the first batch starts the list and the next ones continue it', async () => {
            flowerStore.settings.pagination = false;
            const onLoaded = vi.fn();
            const list = usePaginatedList({ ...makeFlowers(35), onLoaded });

            await list.init();
            await list.nextBatch();
            await list.nextBatch();

            expect(onLoaded.mock.calls.map(([info]) => [info.offset, info.append, info.items.length]))
                .toEqual([[0, false, 10], [10, true, 10], [20, true, 10]]);
        });

        test('is not called for what is dropped: a page that a newer one made old', async () => {
            const hold = gate();
            const fetchPage = vi.fn(async ({ offset }) => {
                if(offset === 0){
                    await hold.promise;
                }
                return [{ id: offset }];
            });
            const onLoaded = vi.fn();
            const list = usePaginatedList({ fetchCount: async () => 99, fetchPage, onLoaded });

            const old = list.init(0);
            await vi.waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));
            await list.init(1);
            hold.open();
            await old;

            expect(onLoaded).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ offset: 10 }));
        });

        test.each([
            ['throws', () => { throw new Error('sync failure'); }],
            ['rejects', () => Promise.reject(new Error('async failure'))],
        ])('a hook that %s goes to the ErrorStore and leaves the list shown', async (_, onLoaded) => {
            const list = usePaginatedList({ ...makeFlowers(5), onLoaded });

            await list.init();
            await vi.waitFor(() => expect(ErrorStore.push).toHaveBeenCalledTimes(1));

            expect(ErrorStore.push.mock.calls[0][0].message).toMatch(/failure/);
            expect(ids(list)).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('prepend and remove', () => {
        test('a flower goes to the top', async () => {
            const list = usePaginatedList(makeFlowers(3));
            await list.init();

            list.prepend({ id: 99 });

            expect(ids(list)).toEqual([99, 1, 2, 3]);
        });

        test('but not twice: it can be in what was read already', async () => {
            const list = usePaginatedList(makeFlowers(3));
            await list.init();

            list.prepend({ id: 2 });

            expect(ids(list)).toEqual([1, 2, 3]);
        });

        test('items that have no id are all kept', async () => {
            const list = usePaginatedList(makeList(2));
            await list.init();

            list.prepend(7);
            list.prepend(7);

            expect(list.state.items).toEqual([7, 7, 1, 2]);
        });

        test('remove drops the flower with that id and does not touch the list when it is not there', async () => {
            const list = usePaginatedList(makeFlowers(4));
            await list.init();

            list.remove(2);
            expect(ids(list)).toEqual([1, 3, 4]);

            const before = list.state.items;
            list.remove(42);
            expect(list.state.items).toBe(before);
        });

        test('remove takes the id as a string too (the id of a route or an attribute)', async () => {
            const list = usePaginatedList(makeFlowers(3));
            await list.init();

            list.remove('2');

            expect(ids(list)).toEqual([1, 3]);
        });
    });

    describe('a named list', () => {
        const listOf = (count = 3, extra = {}) => usePaginatedList({ ...makeFlowers(count), list: 'local', ...extra });

        test('shows a flower that is added to it and drops one that is deleted', async () => {
            const list = listOf();
            await list.init();

            flowerAdded('local', { id: 50 });
            expect(ids(list)).toEqual([50, 1, 2, 3]);

            flowerRemoved('local', 2);
            expect(ids(list)).toEqual([50, 1, 3]);
        });

        test('ignores what happens to the other lists', async () => {
            const list = listOf();
            await list.init();

            flowerAdded('mutations', { id: 50 });
            flowerRemoved('mutations', 1);
            listReset('mutations');

            expect(ids(list)).toEqual([1, 2, 3]);
        });

        test('a reset reads it again, from the first page', async () => {
            const source = makeFlowers(25);
            const list = usePaginatedList({ ...source, list: 'local' });
            await list.init(2);
            expect(list.state.page).toBe(2);

            source.fetchCount.mockResolvedValue(3);
            source.fetchPage.mockImplementation(async () => [{ id: 7 }]);
            listReset('local');
            await vi.waitFor(() => expect(ids(list)).toEqual([7]));

            expect(list.state.page).toBe(0);
            expect(list.state.totalPages).toBe(1);
        });

        test('a flower that arrives while the list is being read is not shown twice', async () => {
            // the flower is in the table already when the page is read, and it is announced after that
            const hold = gate();
            const fetchPage = vi.fn(async () => {
                await hold.promise;
                return [{ id: 3 }, { id: 2 }, { id: 1 }];
            });
            const list = usePaginatedList({ fetchCount: async () => 3, fetchPage, list: 'local' });

            const reading = list.init();
            hold.open();
            await reading;
            flowerAdded('local', { id: 3 });

            expect(ids(list)).toEqual([3, 2, 1]);
        });

        test('stops listening when the scope of the view ends', async () => {
            const scope = effectScope();
            const list = scope.run(() => listOf());
            await list.init();

            scope.stop();
            flowerAdded('local', { id: 50 });

            expect(ids(list)).toEqual([1, 2, 3]);
        });

        test('a list without a name listens to nothing', async () => {
            const list = usePaginatedList(makeFlowers(3));
            await list.init();

            flowerAdded('local', { id: 50 });

            expect(ids(list)).toEqual([1, 2, 3]);
        });
    });

    test('follows the settings: the same list is paginated or not as they say when it starts', async () => {
        const list = usePaginatedList(makeList(25));
        expect(list.isPaginated.value).toBe(true);

        flowerStore.settings.pagination = false;
        expect(list.isPaginated.value).toBe(false);
    });
});
