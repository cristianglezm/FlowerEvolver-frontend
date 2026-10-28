// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SubspeciesMap from '../../../../src/components/species/SubspeciesMap.vue';
import { SpeciesModel } from '../../../../src/services/SpeciesModel';
import { classifierJson } from '../../helpers/classifier';

describe('SubspeciesMap', () => {
    let getContext;
    let model;

    const mountMap = (props = {}) => mount(SubspeciesMap, {
        props: { model, counts: new Map([['0,0', 3], ['1,0', 1]]), name: 'Slender Aster', ...props },
    });
    const card = (wrapper, x, y) => wrapper.get(`[data-testid="subspecies-card-${x}-${y}"]`);

    beforeEach(() => {
        getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        // 2 x 1 sub-species, not toroidal
        model = SpeciesModel.fromJson(classifierJson({ width: '2', height: '1', toroidal: false, weights: [0, 0, 0, 0, 0, 1, 1, 1, 1, 0] }));
    });

    afterEach(() => {
        getContext.mockRestore();
    });

    test('has a card for every sub-species, named a, b, ... row by row, with its flowers', () => {
        const wrapper = mountMap();

        expect(wrapper.get('h3').text()).toBe('Slender Aster: sub-species');
        expect(wrapper.findAll('[data-testid^="subspecies-card-"]').filter((c) => !c.attributes('data-testid').endsWith('count'))).toHaveLength(2);
        expect(card(wrapper, 0, 0).text()).toContain('a');
        expect(card(wrapper, 0, 0).get('[data-testid="subspecies-card-count"]').text()).toBe('3');
        expect(card(wrapper, 1, 0).text()).toContain('b');
        expect(card(wrapper, 1, 0).get('[data-testid="subspecies-card-count"]').text()).toBe('1');
    });

    test('a grid of 2 by 2 is lettered by row: the second row starts at c', () => {
        model = SpeciesModel.fromJson(classifierJson({ toroidal: false }));

        const wrapper = mountMap({ counts: new Map() });

        expect(card(wrapper, 0, 1).text()).toContain('c');
        expect(card(wrapper, 1, 1).text()).toContain('d');
        expect(card(wrapper, 1, 1).get('[data-testid="subspecies-card-count"]').text()).toBe('0');
    });

    test('does not use the ids of the cards of the species map', () => {
        expect(mountMap().find('[data-testid="species-card-0-0"]').exists()).toBe(false);
    });

    test('a click on a card emits its sub-species, and the selected one is marked', async () => {
        const wrapper = mountMap({ selected: { x: 1, y: 0 } });

        await card(wrapper, 0, 0).trigger('click');

        expect(wrapper.emitted('select')).toEqual([[{ x: 0, y: 0 }]]);
        expect(card(wrapper, 1, 0).classes()).toContain('selected');
        expect(card(wrapper, 0, 0).classes()).not.toContain('selected');
    });

    test('All of it emits null, and is off while nothing is selected', async () => {
        const none = mountMap();
        expect(none.get('[data-testid="subspecies-all"]').attributes('disabled')).toBeDefined();

        const wrapper = mountMap({ selected: { x: 0, y: 0 } });
        await wrapper.get('[data-testid="subspecies-all"]').trigger('click');

        expect(wrapper.emitted('select')).toEqual([[null]]);
    });
});
