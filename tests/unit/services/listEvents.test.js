import { describe, test, expect, vi, afterEach } from 'vitest';
import { flowerAdded, flowerRemoved, listReset, listenToList } from '../../../src/services/listEvents';

describe('listEvents', () => {
    const stops = [];
    const listen = (list, handlers) => {
        const stop = listenToList(list, handlers);
        stops.push(stop);
        return stop;
    };
    afterEach(() => {
        stops.splice(0).forEach((stop) => stop());
    });

    test('a listener gets what happened to its list', () => {
        const handlers = { added: vi.fn(), removed: vi.fn(), reset: vi.fn() };
        listen('local', handlers);

        flowerAdded('local', { id: 1 });
        flowerRemoved('local', 1);
        listReset('local');

        expect(handlers.added).toHaveBeenCalledExactlyOnceWith({ id: 1 });
        expect(handlers.removed).toHaveBeenCalledExactlyOnceWith(1);
        expect(handlers.reset).toHaveBeenCalledTimes(1);
    });

    test('and nothing about the other lists', () => {
        const handlers = { added: vi.fn(), removed: vi.fn(), reset: vi.fn() };
        listen('local', handlers);

        flowerAdded('mutations', { id: 1 });
        flowerRemoved('mutations', 1);
        listReset('mutations');

        expect(handlers.added).not.toHaveBeenCalled();
        expect(handlers.removed).not.toHaveBeenCalled();
        expect(handlers.reset).not.toHaveBeenCalled();
    });

    test('every listener of the list is told, and each handler is optional', () => {
        const first = vi.fn();
        const second = vi.fn();
        listen('local', { added: first });
        listen('local', { added: second });
        listen('local');

        expect(() => {
            flowerAdded('local', { id: 2 });
            flowerRemoved('local', 2);
            listReset('local');
        }).not.toThrow();
        expect(first).toHaveBeenCalledExactlyOnceWith({ id: 2 });
        expect(second).toHaveBeenCalledExactlyOnceWith({ id: 2 });
    });

    test('stopping a listener stops only that one', () => {
        const kept = vi.fn();
        const dropped = vi.fn();
        listen('local', { added: kept });
        const stop = listen('local', { added: dropped });

        stop();
        flowerAdded('local', { id: 3 });

        expect(dropped).not.toHaveBeenCalled();
        expect(kept).toHaveBeenCalledTimes(1);
    });
});
