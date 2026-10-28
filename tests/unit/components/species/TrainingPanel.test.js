// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TrainingPanel from '../../../../src/components/species/TrainingPanel.vue';

const evaluation = (counts) => ({ meanQuantizationError: 1, nodeCounts: counts });
const training = (changes = {}) => ({ kind: null, phase: '', done: 0, total: 0, qe: [], before: null, now: null, result: null, ...changes });
const mountPanel = (state) => mount(TrainingPanel, { props: { training: state, width: 3, height: 2 } });

describe('TrainingPanel', () => {
    test('is empty when there is nothing to say', () => {
        const wrapper = mountPanel(training());

        expect(wrapper.find('[data-testid="training-progress"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="training-result"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="qe-chart"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="training-occupancy"]').exists()).toBe(false);
    });

    describe('while it runs', () => {
        test.each([
            [{ phase: 'preparing', done: 25, total: 60 }, 'Reading your flowers: 25 of 60'],
            [{ phase: 'training', done: 0, total: 3 }, 'Starting'],
            [{ phase: 'training', done: 2, total: 3 }, 'Epoch 2 of 3'],
            [{ phase: '', done: 0, total: 0 }, 'Starting'],
        ])('says where it is: %j', (state, text) => {
            const wrapper = mountPanel(training({ kind: 'fineTune', ...state }));

            expect(wrapper.get('[data-testid="training-phase"]').text()).toBe(text);
        });

        test('shows the progress, and a button to cancel it', async () => {
            const wrapper = mountPanel(training({ kind: 'fineTune', phase: 'training', done: 1, total: 4 }));

            const progress = wrapper.get('[data-testid="training-progress"]');
            expect(progress.attributes('aria-valuenow')).toBe('1');
            expect(progress.attributes('aria-valuemax')).toBe('4');
            expect(progress.get('.bar').attributes('style')).toContain('width: 25%');
            await wrapper.get('[data-testid="training-cancel"]').trigger('click');
            expect(wrapper.emitted('cancel')).toHaveLength(1);
        });

        test('a progress bar with nothing to count yet is not a division by zero', () => {
            const progress = mountPanel(training({ kind: 'fineTune' })).get('[data-testid="training-progress"]');
            expect(progress.attributes('aria-valuemax')).toBe('1');
            expect(progress.get('.bar').attributes('style')).toContain('width: 0%');
        });
    });

    describe('when it is not running', () => {
        test('has no progress and no button to cancel, the result stays', () => {
            const wrapper = mountPanel(training({ result: { outcome: 'done', message: 'Done. It went well.' } }));

            expect(wrapper.find('[data-testid="training-progress"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="training-cancel"]').exists()).toBe(false);
            expect(wrapper.get('[data-testid="training-result"]').text()).toBe('Done. It went well.');
            expect(wrapper.get('[data-testid="training-result"]').classes()).toContain('done');
        });

        test('a failure is marked as one', () => {
            const wrapper = mountPanel(training({ result: { outcome: 'failed', message: 'Fine-tuning failed.' } }));
            expect(wrapper.get('[data-testid="training-result"]').classes()).toContain('failed');
        });
    });

    test('draws the distance after each epoch when there is any', () => {
        const wrapper = mountPanel(training({ qe: [1, 0.8] }));
        expect(wrapper.findAll('circle')).toHaveLength(2);
    });

    test('compares how the flowers were spread over the species before and now', () => {
        const wrapper = mountPanel(training({ before: evaluation([6, 0, 0, 0, 0, 0]), now: evaluation([2, 1, 1, 1, 1, 0]) }));

        const grids = wrapper.findAll('[data-testid="occupancy-grid"]');
        expect(grids).toHaveLength(2);
        expect(grids[0].attributes('aria-label')).toBe('Flowers of each species before');
        expect(grids[1].attributes('aria-label')).toBe('Flowers of each species now');
        expect(grids[0].findAll('i')[0].attributes('title')).toBe('6 flowers at 0, 0');
        expect(grids[1].findAll('i')[0].attributes('title')).toBe('2 flowers at 0, 0');
        expect(wrapper.text()).toContain('Before');
        expect(wrapper.text()).toContain('Now');
    });
});
