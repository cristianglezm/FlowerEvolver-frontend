// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { markRaw } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import FineTuneModal from '../../../../src/components/species/FineTuneModal.vue';
import { useSpeciesStore } from '../../../../src/stores/SpeciesStore';
import { SpeciesModel } from '../../../../src/services/SpeciesModel';
import { classifierJson } from '../../helpers/classifier';

vi.mock('../../../../src/services/speciesWorker', () => ({
    getSpeciesClient: vi.fn(),
}));

describe('FineTuneModal', () => {
    let SpeciesStore;
    let wrapper;

    const field = (name) => wrapper.get(`[data-testid="finetune-${name}"]`);
    const start = () => wrapper.get('[data-testid="finetune-start"]');
    const close = () => wrapper.get('[data-testid="finetune-close"]');
    const dialog = () => wrapper.get('dialog').element;

    beforeEach(() => {
        createTestingPinia({ createSpy: vi.fn });
        SpeciesStore = useSpeciesStore();
        SpeciesStore.model = markRaw(SpeciesModel.fromJson(classifierJson()));
        SpeciesStore.fineTune.mockResolvedValue('done');
        wrapper = mount(FineTuneModal);
    });

    test('opens and closes the dialog when the component that has it says so', () => {
        expect(dialog().open).toBe(false);

        wrapper.vm.open();
        expect(dialog().open).toBe(true);

        wrapper.vm.close();
        expect(dialog().open).toBe(false);
    });

    test('a button closes it', async () => {
        wrapper.vm.open();
        await close().trigger('click');
        expect(dialog().open).toBe(false);
    });

    describe('the parameters', () => {
        test('are 3 epochs, a learning rate of 0.3 and a radius of 1 to start with, and they are used', async () => {
            expect(field('epochs').element.value).toBe('3');
            expect(field('lr').element.value).toBe('0.3');
            expect(field('radius').element.value).toBe('1');

            await start().trigger('click');

            expect(SpeciesStore.fineTune).toHaveBeenCalledExactlyOnceWith({ epochs: 3, baseLR: 0.3, baseRadius: 1 });
        });

        test('are what was typed, as numbers', async () => {
            await field('epochs').setValue('5');
            await field('lr').setValue('0.1');
            await field('radius').setValue('2.5');

            await start().trigger('click');

            expect(SpeciesStore.fineTune).toHaveBeenCalledWith({ epochs: 5, baseLR: 0.1, baseRadius: 2.5 });
        });

        test.each([
            ['no epochs', 'epochs', '0', 'Epochs must be a whole number of at least 1.'],
            ['half an epoch', 'epochs', '1.5', 'Epochs must be a whole number of at least 1.'],
            ['epochs left empty', 'epochs', '', 'Epochs must be a whole number of at least 1.'],
            ['a learning rate of 0', 'lr', '0', 'The learning rate must be above 0.'],
            ['a negative learning rate', 'lr', '-0.2', 'The learning rate must be above 0.'],
            ['a learning rate left empty', 'lr', '', 'The learning rate must be above 0.'],
            ['a radius of 0', 'radius', '0', 'The radius must be above 0.'],
        ])('%s: says what is wrong and does not start', async (_, name, value, message) => {
            await field(name).setValue(value);

            expect(wrapper.get('[data-testid="finetune-invalid"]').text()).toBe(message);
            expect(start().element.disabled).toBe(true);
            await start().trigger('click');
            expect(SpeciesStore.fineTune).not.toHaveBeenCalled();
        });

        test('say nothing when they are fine, and it can start', () => {
            expect(wrapper.find('[data-testid="finetune-invalid"]').exists()).toBe(false);
            expect(start().element.disabled).toBe(false);
        });
    });

    describe('the progress', () => {
        test('is not there before anything was done', () => {
            expect(wrapper.find('[data-testid="training-panel"]').exists()).toBe(false);
        });

        test('is there while it runs, and it can only be cancelled, not started again or closed', async () => {
            SpeciesStore.training.kind = 'fineTune';
            SpeciesStore.training.ran = 'fineTune';
            SpeciesStore.training.phase = 'training';
            SpeciesStore.training.done = 1;
            SpeciesStore.training.total = 3;
            await wrapper.vm.$nextTick();

            expect(wrapper.find('[data-testid="training-panel"]').exists()).toBe(true);
            expect(start().element.disabled).toBe(true);
            expect(close().element.disabled).toBe(true);
            await wrapper.get('[data-testid="training-cancel"]').trigger('click');
            expect(SpeciesStore.cancelTraining).toHaveBeenCalledTimes(1);
        });

        test('stays when it ended, with how it went, and the dialog can be closed and started again', async () => {
            SpeciesStore.training.ran = 'fineTune';
            SpeciesStore.training.result = { outcome: 'done', message: 'Done. All good.' };
            await wrapper.vm.$nextTick();

            expect(wrapper.get('[data-testid="training-result"]').text()).toBe('Done. All good.');
            expect(start().element.disabled).toBe(false);
            expect(close().element.disabled).toBe(false);
        });
    });

    describe('Esc', () => {
        const pressEsc = () => {
            const event = new Event('cancel', { cancelable: true });
            dialog().dispatchEvent(event);
            return event;
        };

        test('closes it as usual when nothing is running', () => {
            expect(pressEsc().defaultPrevented).toBe(false);
        });

        test('does not while it runs, it would go on behind the dialog', async () => {
            SpeciesStore.training.kind = 'fineTune';
            await wrapper.vm.$nextTick();

            expect(pressEsc().defaultPrevented).toBe(true);
        });
    });
});
