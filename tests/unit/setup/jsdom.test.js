// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';

// jsdom has no layout: without the setup file window.scrollTo() reports "Not implemented" and
// Element.scrollIntoView() is missing. jsdom reports on its own virtual console (a private member of
// the window, which is what this is about), not through console.error.
describe('the scrolling of the jsdom tests', () => {
    test('window.scrollTo does nothing, quietly', () => {
        const reported = [];
        const report = (error) => reported.push(error.message);
        window._virtualConsole.on('jsdomError', report);

        window.scrollTo({ top: 0, behavior: 'smooth' });

        window._virtualConsole.off('jsdomError', report);
        expect(reported).toEqual([]);
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
