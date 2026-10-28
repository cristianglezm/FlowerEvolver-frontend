// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SpeciesDetail from '../../../../src/components/species/SpeciesDetail.vue';
import { SpeciesModel } from '../../../../src/services/SpeciesModel';
import { classifierJson } from '../../helpers/classifier';

describe('SpeciesDetail', () => {
    let getContext;
    let model;

    const mountDetail = (props = {}) => mount(SpeciesDetail, {
        props: { model, counts: new Map([['0,0', 1], ['1,0', 3], ['0,1', 0]]), selected: { x: 0, y: 0 }, ...props },
    });

    beforeEach(() => {
        getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        model = SpeciesModel.fromJson(classifierJson());
    });

    afterEach(() => {
        getContext.mockRestore();
    });

    test('shows the name, the cell and how many flowers the species has', () => {
        const wrapper = mountDetail();

        expect(wrapper.get('[data-testid="species-detail-name"]').text()).toBe('Slender Aster (0, 0)');
        expect(wrapper.get('[data-testid="species-detail-count"]').text()).toBe('1 flower');
    });

    test('says flowers when there are not one, and none when there are none', () => {
        expect(mountDetail({ selected: { x: 1, y: 0 } }).get('[data-testid="species-detail-count"]').text()).toBe('3 flowers');
        expect(mountDetail({ selected: { x: 0, y: 1 } }).get('[data-testid="species-detail-count"]').text()).toBe('0 flowers');
        expect(mountDetail({ selected: { x: 1, y: 1 } }).get('[data-testid="species-detail-count"]').text()).toBe('0 flowers');
    });

    test('lists the species whose prototypes are closest, closest first, with their flowers', () => {
        // the species of the fixture are 1, 2 and 3.74 away from (0, 0), see the weights in helpers/classifier.js
        const buttons = mountDetail().findAll('[data-testid^="species-similar-"]');

        expect(buttons.map((button) => button.attributes('data-testid'))).toEqual([
            'species-similar-1-0', 'species-similar-0-1', 'species-similar-1-1',
        ]);
        expect(buttons[0].text()).toBe('Ruffled Aster (3)');
        expect(buttons[1].text()).toBe('Slender Iris (0)');
    });

    test('shows at most the four closest on a bigger map', () => {
        const big = new SpeciesModel({ width: 3, height: 2, inputDim: 1, imageSize: 1, toroidal: false, weights: [0, 1, 2, 3, 4, 5] });
        const wrapper = mountDetail({ model: big, counts: new Map(), selected: { x: 0, y: 0 } });

        expect(wrapper.findAll('[data-testid^="species-similar-"]').map((b) => b.attributes('data-testid'))).toEqual([
            'species-similar-1-0', 'species-similar-2-0', 'species-similar-0-1', 'species-similar-1-1',
        ]);
    });

    test('a click on a similar species emits it', async () => {
        const wrapper = mountDetail();

        await wrapper.get('[data-testid="species-similar-0-1"]').trigger('click');

        expect(wrapper.emitted('select')).toEqual([[{ x: 0, y: 1 }]]);
    });

    test('Use as parent emits when the species has flowers', async () => {
        const wrapper = mountDetail({ selected: { x: 1, y: 0 } });

        await wrapper.get('[data-testid="species-use-as-parent"]').trigger('click');

        expect(wrapper.emitted('use-as-parent')).toHaveLength(1);
    });

    test('Use as parent is off for an empty species, and a click does not emit', async () => {
        const wrapper = mountDetail({ selected: { x: 0, y: 1 } });
        const button = wrapper.get('[data-testid="species-use-as-parent"]');

        await button.trigger('click');

        expect(button.attributes('disabled')).toBeDefined();
        expect(wrapper.emitted('use-as-parent')).toBeUndefined();
    });

    describe('splitting', () => {
        test('Split emits when the species has the flowers a map of 2 needs, 6', async () => {
            const wrapper = mountDetail({ counts: new Map([['0,0', 6]]) });
            const button = wrapper.get('[data-testid="species-split"]');

            await button.trigger('click');

            expect(button.text()).toBe('Split...');
            expect(wrapper.emitted('split')).toHaveLength(1);
        });

        test('Split is off with fewer flowers, and says why', async () => {
            const wrapper = mountDetail({ counts: new Map([['0,0', 5]]) });
            const button = wrapper.get('[data-testid="species-split"]');

            await button.trigger('click');

            expect(button.attributes('disabled')).toBeDefined();
            expect(button.attributes('title')).toBe('A species needs at least 6 flowers to be split');
            expect(wrapper.emitted('split')).toBeUndefined();
        });

        test('Remove the split is only there when the species is split, and emits', async () => {
            expect(mountDetail().find('[data-testid="species-unsplit"]').exists()).toBe(false);
            const wrapper = mountDetail({ isSplit: true, counts: new Map([['0,0', 6]]) });

            await wrapper.get('[data-testid="species-unsplit"]').trigger('click');

            expect(wrapper.emitted('unsplit')).toHaveLength(1);
            expect(wrapper.get('[data-testid="species-split"]').text()).toBe('Split again...');
        });
    });

    test('follows the species that is selected', async () => {
        const wrapper = mountDetail();

        await wrapper.setProps({ selected: { x: 1, y: 0 } });

        expect(wrapper.get('[data-testid="species-detail-name"]').text()).toBe('Ruffled Aster (1, 0)');
        expect(wrapper.find('[data-testid="species-similar-1-0"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="species-similar-0-0"]').exists()).toBe(true);
    });
});
