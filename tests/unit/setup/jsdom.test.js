// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';

// jsdom has no layout: the setup file replaces scrolling methods with harmless no-ops.
describe('the scrolling of the jsdom tests', () => {
    test('window.scrollTo does nothing, quietly', () => {
        expect(() => window.scrollTo({ top: 0, behavior: 'smooth' })).not.toThrow();
    });

    test('an element can be scrolled into view', () => {
        expect(() => document.createElement('div').scrollIntoView({ behavior: 'smooth' })).not.toThrow();
    });

    test('a dialog opens with showModal and closes with close, saying it closed', () => {
        const dialog = document.createElement('dialog');
        document.body.appendChild(dialog);
        let closed = 0;
        dialog.addEventListener('close', () => ++closed);

        expect(dialog.open).toBe(false);
        dialog.showModal();
        expect(dialog.open).toBe(true);
        dialog.close();

        expect(dialog.open).toBe(false);
        expect(closed).toBe(1);
    });
});
