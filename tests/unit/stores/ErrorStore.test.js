import { describe, test, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useErrorStore } from '../../../src/stores/ErrorStore';

describe('ErrorStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    test('starts empty', () => {
        const store = useErrorStore();
        expect(store.getErrors).toEqual([]);
        expect(store.getLength).toBe(0);
    });

    test('push adds an error', () => {
        const store = useErrorStore();
        store.push({ message: 'something went wrong' });
        expect(store.getLength).toBe(1);
        expect(store.getErrors[0]).toEqual({ message: 'something went wrong' });
    });

    test('pop removes the last error', () => {
        const store = useErrorStore();
        store.push({ message: 'first' });
        store.push({ message: 'second' });
        store.pop();
        expect(store.getLength).toBe(1);
        expect(store.getErrors[0]).toEqual({ message: 'first' });
    });

    test('clear empties the list', () => {
        const store = useErrorStore();
        store.push({ message: 'first' });
        store.push({ message: 'second' });
        store.clear();
        expect(store.getErrors).toEqual([]);
        expect(store.getLength).toBe(0);
    });
});
