// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SpeciesMap from '../../../../src/components/species/SpeciesMap.vue';
import { SpeciesModel } from '../../../../src/services/SpeciesModel';
import { classifierJson } from '../../helpers/classifier';

describe('SpeciesMap', () => {
    let getContext;
    let model;

    const mountMap = (props = {}) => mount(SpeciesMap, {
        props: { model, counts: new Map([['1,0', 3], ['0,1', 1]]), ...props },
    });
    const count = (wrapper, x, y) => wrapper.get(`[data-testid="species-card-${x}-${y}"] [data-testid="species-card-count"]`).text();

    beforeEach(() => {
        getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        model = SpeciesModel.fromJson(classifierJson());
    });

    afterEach(() => {
        getContext.mockRestore();
    });

    test('has a card for every species of the classifier, with how many flowers it has', () => {
        const wrapper = mountMap();

        expect(wrapper.findAll('[data-testid^="species-card-"]:not([data-testid="species-card-count"])')).toHaveLength(4);
        expect(count(wrapper, 1, 0)).toBe('3');
        expect(count(wrapper, 0, 1)).toBe('1');
        expect(count(wrapper, 0, 0)).toBe('0');
        expect(count(wrapper, 1, 1)).toBe('0');
    });

    test('is as many columns as the classifier has', () => {
        expect(mountMap().get('[data-testid="species-map"]').attributes('style')).toContain('repeat(2, minmax(0, 1fr))');
    });

    test('leaves out the species with no flowers when asked, and lets the cards flow', () => {
        const wrapper = mountMap({ hideEmpty: true });

        expect(wrapper.find('[data-testid="species-card-0-0"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="species-card-1-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="species-card-1-0"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="species-card-0-1"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="species-map"]').classes()).toContain('compact');
        expect(wrapper.get('[data-testid="species-map"]').attributes('style') ?? '').not.toContain('repeat(2');
    });

    test('the card of the selected species is marked', () => {
        const wrapper = mountMap({ selected: { x: 0, y: 1 } });

        expect(wrapper.get('[data-testid="species-card-0-1"]').classes()).toContain('selected');
        expect(wrapper.get('[data-testid="species-card-1-0"]').classes()).not.toContain('selected');
        // same column and same row as the selected one
        expect(wrapper.get('[data-testid="species-card-0-0"]').classes()).not.toContain('selected');
        expect(wrapper.get('[data-testid="species-card-1-1"]').classes()).not.toContain('selected');
    });

    test('a click on a card emits the species', async () => {
        const wrapper = mountMap();

        await wrapper.get('[data-testid="species-card-1-1"]').trigger('click');

        expect(wrapper.emitted('select')).toEqual([[{ x: 1, y: 1 }]]);
    });

    test('with no flowers anywhere every card is there and empty', () => {
        const wrapper = mountMap({ counts: new Map() });
        expect(count(wrapper, 0, 0)).toBe('0');
        expect(wrapper.findAll('.empty')).toHaveLength(4);
    });

    test('the silhouettes are not worked out again when only the counts change', async () => {
        const prototype = vi.spyOn(model, 'prototype');
        const wrapper = mountMap();
        expect(prototype).toHaveBeenCalledTimes(4);

        await wrapper.setProps({ counts: new Map([['1,0', 4], ['0,1', 1]]) });
        await wrapper.setProps({ counts: new Map([['1,0', 5], ['0,1', 1]]) });

        expect(prototype).toHaveBeenCalledTimes(4);
        expect(count(wrapper, 1, 0)).toBe('5');
    });
});
