// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { markRaw, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import SpeciesBadge from '../../../../src/components/species/SpeciesBadge.vue';
import { useSpeciesStore } from '../../../../src/stores/SpeciesStore';
import { SpeciesModel } from '../../../../src/services/SpeciesModel';
import { classifierJson } from '../../helpers/classifier';

// the store only reads the worker when it starts, nothing here does
vi.mock('../../../../src/services/speciesWorker', () => ({
    getSpeciesClient: vi.fn(),
}));

const page = { template: '<div />' };

describe('SpeciesBadge', () => {
    let SpeciesStore;
    let router;

    const mountBadge = (id = 1) => mount(SpeciesBadge, { props: { id }, global: { plugins: [router] } });

    beforeEach(async () => {
        createTestingPinia({ createSpy: vi.fn });
        SpeciesStore = useSpeciesStore();
        SpeciesStore.model = markRaw(SpeciesModel.fromJson(classifierJson()));
        SpeciesStore.fp = 'fp1';
        router = createRouter({
            history: createMemoryHistory(),
            routes: [{ path: '/', component: page }, { path: '/Species', name: 'Species', component: page }],
        });
        router.push('/');
        await router.isReady();
    });

    describe('shows nothing', () => {
        test('until the flower has a species', () => {
            expect(mountBadge().find('[data-testid="species-badge"]').exists()).toBe(false);
        });

        test('for a flower that could not be classified', () => {
            SpeciesStore.rows.set(1, { id: 1, x: null, y: null, d: null, fp: 'fp1' });
            expect(mountBadge().find('[data-testid="species-badge"]').exists()).toBe(false);
        });

        test('for a species of another classifier', () => {
            SpeciesStore.rows.set(1, { id: 1, x: 1, y: 0, d: 0.5, fp: 'someone-elses' });
            expect(mountBadge().find('[data-testid="species-badge"]').exists()).toBe(false);
        });
    });

    test('shows the name of the species and its cell, with the distance in the title', () => {
        SpeciesStore.rows.set(1, { id: 1, x: 1, y: 0, d: 0.5, fp: 'fp1' });

        const badge = mountBadge().get('[data-testid="species-badge"]');

        expect(badge.text()).toBe('Ruffled Aster (1, 0)');
        expect(badge.attributes('title')).toContain('Ruffled Aster');
        expect(badge.attributes('title')).toContain('0.50');
        expect(badge.classes()).not.toContain('atypical');
    });

    test('appears when the classification arrives', async () => {
        const wrapper = mountBadge();
        expect(wrapper.find('[data-testid="species-badge"]').exists()).toBe(false);

        SpeciesStore.rows.set(1, { id: 1, x: 0, y: 1, d: 0.5, fp: 'fp1' });
        await nextTick();

        expect(wrapper.get('[data-testid="species-badge"]').text()).toBe('Slender Iris (0, 1)');
    });

    describe('sub-species', () => {
        const row = (overrides = {}) => ({ id: 1, x: 1, y: 0, d: 0.5, fp: 'fp1', sx: 1, sy: 1, sfp: 'sub1', ...overrides });

        beforeEach(() => {
            // (1, 0) is split in 2 x 2
            SpeciesStore.submaps = new Map([['1,0', { subfp: 'sub1', w: 2, h: 2, flowers: 8 }]]);
        });

        test('adds the letter of its sub-species, counted by rows: (1, 1) of a map 2 wide is d', () => {
            SpeciesStore.rows.set(1, row());

            const badge = mountBadge().get('[data-testid="species-badge"]');

            expect(badge.text()).toBe('Ruffled Aster (1, 0) / d');
            expect(badge.attributes('title')).toContain('sub-species d');
        });

        test.each([
            ['the species is not split', { x: 0, y: 1 }],
            ['it was placed by another map', { sfp: 'older' }],
            ['it could not be placed', { sx: null, sy: null }],
            ['it was not placed yet', { sx: undefined, sy: undefined, sfp: undefined }],
        ])('adds nothing when %s', (_, overrides) => {
            SpeciesStore.rows.set(1, row(overrides));

            const wrapper = mountBadge();

            expect(wrapper.find('[data-testid="species-sub"]').exists()).toBe(false);
            expect(wrapper.get('[data-testid="species-badge"]').attributes('title')).not.toContain('sub-species');
        });
    });

    describe('atypical', () => {
        beforeEach(() => {
            SpeciesStore.summary = { counts: new Map(), classified: 30, atypicalAbove: 2 };
        });

        test('is marked when the flower is farther from its species than the limit', () => {
            SpeciesStore.rows.set(1, { id: 1, x: 1, y: 0, d: 2.5, fp: 'fp1' });

            const badge = mountBadge().get('[data-testid="species-badge"]');

            expect(badge.classes()).toContain('atypical');
            expect(badge.find('[data-testid="species-atypical"]').exists()).toBe(true);
            expect(badge.attributes('title')).toContain('farther');
        });

        test('is not marked at or under the limit', () => {
            SpeciesStore.rows.set(1, { id: 1, x: 1, y: 0, d: 2, fp: 'fp1' });
            expect(mountBadge().find('[data-testid="species-atypical"]').exists()).toBe(false);
        });
    });

    test('a click selects its species and goes to the Species tab', async () => {
        SpeciesStore.rows.set(1, { id: 1, x: 1, y: 0, d: 0.5, fp: 'fp1' });

        await mountBadge().get('[data-testid="species-badge"]').trigger('click');

        expect(SpeciesStore.select).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 0 });
        await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/Species'));
    });
});
