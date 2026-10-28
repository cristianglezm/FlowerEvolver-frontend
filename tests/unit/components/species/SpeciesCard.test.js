// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SpeciesCard from '../../../../src/components/species/SpeciesCard.vue';

describe('SpeciesCard', () => {
    let getContext;

    const mountCard = (props = {}) => mount(SpeciesCard, {
        props: { x: 2, y: 1, name: 'Spiral Iris', count: 3, max: 6, alpha: [0, 0, 0, 0], size: 2, ...props },
    });

    beforeEach(() => {
        getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    });

    afterEach(() => {
        getContext.mockRestore();
    });

    test('shows the name and the count, and says both with the cell in the title', () => {
        const card = mountCard();

        expect(card.text()).toContain('Spiral Iris');
        expect(card.get('[data-testid="species-card-count"]').text()).toBe('3');
        expect(card.attributes('title')).toBe('Spiral Iris (2, 1): 3 flowers');
        expect(card.attributes('data-testid')).toBe('species-card-2-1');
    });

    test('the start of its test ids can be another, for a second map on the page', () => {
        const card = mountCard({ idPrefix: 'subspecies-card' });

        expect(card.attributes('data-testid')).toBe('subspecies-card-2-1');
        expect(card.get('[data-testid="subspecies-card-count"]').text()).toBe('3');
    });

    test('says flower when it has one', () => {
        expect(mountCard({ count: 1 }).attributes('title')).toBe('Spiral Iris (2, 1): 1 flower');
    });

    test('is greener the more flowers it has compared with the busiest species', () => {
        expect(mountCard({ count: 3, max: 6 }).attributes('style')).toContain('--heat: 0.5');
        expect(mountCard({ count: 6, max: 6 }).attributes('style')).toContain('--heat: 1');
        expect(mountCard({ count: 0, max: 6 }).attributes('style')).toContain('--heat: 0');
        // no flowers anywhere is not a division by zero
        expect(mountCard({ count: 0, max: 0 }).attributes('style')).toContain('--heat: 0');
    });

    test('is dimmed when it is empty and marked when it is selected', () => {
        expect(mountCard({ count: 0 }).classes()).toContain('empty');
        expect(mountCard({ count: 2 }).classes()).not.toContain('empty');
        expect(mountCard({ selected: true }).classes()).toContain('selected');
        expect(mountCard().classes()).not.toContain('selected');
    });

    test('a click emits select', async () => {
        const card = mountCard();
        await card.trigger('click');
        expect(card.emitted('select')).toHaveLength(1);
    });
});
