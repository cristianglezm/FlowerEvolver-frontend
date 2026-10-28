// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useClassifierReset } from '../../../src/composables/useClassifierReset';
import { useSpeciesStore } from '../../../src/stores/SpeciesStore';

vi.mock('../../../src/services/speciesWorker', () => ({
    getSpeciesClient: vi.fn(),
}));

describe('useClassifierReset', () => {
    let SpeciesStore;
    let emitter;
    let reset;

    beforeEach(() => {
        createTestingPinia({ createSpy: vi.fn });
        SpeciesStore = useSpeciesStore();
        emitter = { emit: vi.fn() };
        // it is used inside a component: it injects the emitter
        mount({ setup(){ reset = useClassifierReset(); return () => h('div'); } }, { global: { provide: { emitter } } });
    });

    describe('canReset', () => {
        test.each([
            ['there is a fine-tuned classifier and nothing is going on', true, null, 'idle', true],
            ['there is none', false, null, 'idle', false],
            ['it is being fine-tuned', true, 'fineTune', 'idle', false],
            ['the flowers are being classified', true, null, 'classifying', false],
        ])('%s', (_, hasTuned, kind, status, expected) => {
            SpeciesStore.hasTuned = hasTuned;
            SpeciesStore.training.kind = kind;
            SpeciesStore.status = status;

            expect(reset.canReset.value).toBe(expected);
        });
    });

    describe('askReset', () => {
        test('asks before it does anything, and says what is lost and what is not', () => {
            reset.askReset();

            expect(SpeciesStore.resetClassifier).not.toHaveBeenCalled();
            expect(emitter.emit).toHaveBeenCalledExactlyOnceWith('showYesNo', expect.objectContaining({
                btnNo: 'no', btnYes: 'Remove it',
                message: expect.stringContaining('your flowers stay'),
            }));
        });

        test('goes back to the built-in classifier when it is confirmed', async () => {
            reset.askReset();
            const [, question] = emitter.emit.mock.calls[0];

            await question.onConfirm();

            expect(SpeciesStore.resetClassifier).toHaveBeenCalledTimes(1);
        });
    });
});
