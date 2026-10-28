import { describe, test, expect, beforeEach } from 'vitest';

// The setup file gives the node tests a localStorage. The stores save settings as JSON and
// a boolean as it is (`setItem(key, this.isLocal)`), and read both back with JSON.parse().
describe('localStorage of the node tests', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('getItem is null for what was never saved', () => {
        expect(localStorage.getItem('missing')).toBeNull();
    });

    test('keeps strings, like the real one: a boolean comes back as text that JSON.parse reads', () => {
        localStorage.setItem('isLocal', true);
        localStorage.setItem('settings', JSON.stringify({ limit: 10 }));

        expect(localStorage.getItem('isLocal')).toBe('true');
        expect(JSON.parse(localStorage.getItem('isLocal'))).toBe(true);
        expect(JSON.parse(localStorage.getItem('settings'))).toEqual({ limit: 10 });
    });

    test('setItem replaces, removeItem forgets, clear empties', () => {
        localStorage.setItem('a', '1');
        localStorage.setItem('a', '2');
        localStorage.setItem('b', '3');
        expect(localStorage.getItem('a')).toBe('2');
        expect(localStorage.length).toBe(2);

        localStorage.removeItem('a');
        expect(localStorage.getItem('a')).toBeNull();
        expect(localStorage.length).toBe(1);
        expect(localStorage.key(0)).toBe('b');
        expect(localStorage.key(5)).toBeNull();

        localStorage.clear();
        expect(localStorage.length).toBe(0);
    });
});
