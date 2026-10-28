// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { markRaw } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import SplitModal from '../../../../src/components/species/SplitModal.vue';
import { useSpeciesStore } from '../../../../src/stores/SpeciesStore';
import { SpeciesModel } from '../../../../src/services/SpeciesModel';
import { classifierJson } from '../../helpers/classifier';

vi.mock('../../../../src/services/speciesWorker', () => ({
    getSpeciesClient: vi.fn(),
}));

describe('SplitModal', () => {
    let SpeciesStore;
    let wrapper;

    const field = (name) => wrapper.get(`[data-testid="split-${name}"]`);
    const start = () => wrapper.get('[data-testid="split-start"]');
    const close = () => wrapper.get('[data-testid="split-close"]');
    const dialog = () => wrapper.get('dialog').element;
    const open = (cell = { x: 1, y: 0 }) => wrapper.vm.open(cell);

    beforeEach(() => {
        createTestingPinia({ createSpy: vi.fn });
        SpeciesStore = useSpeciesStore();
        SpeciesStore.model = markRaw(SpeciesModel.fromJson(classifierJson()));
        SpeciesStore.fp = 'fp1';
        // (1, 0) has 12 flowers, (0, 1) has 5
        SpeciesStore.summary = { counts: new Map([['1,0', 12], ['0,1', 5]]), classified: 17, atypicalAbove: null, atypical: 0 };
        SpeciesStore.split.mockResolvedValue('done');
        wrapper = mount(SplitModal);
    });

    test('opens and closes the dialog, and a button closes it', async () => {
        expect(dialog().open).toBe(false);

        open();
        expect(dialog().open).toBe(true);

        await close().trigger('click');
        expect(dialog().open).toBe(false);
    });

    test('says which species it is for and how many flowers it has', async () => {
        open();
        await wrapper.vm.$nextTick();

        expect(wrapper.get('h2').text()).toBe('Split Ruffled Aster');
        expect(wrapper.get('.about').text()).toContain('12 flowers');
    });

    test('starts with 2 columns, 2 rows and 3 epochs, and splits the species it was opened for with them', async () => {
        open({ x: 1, y: 0 });
        await wrapper.vm.$nextTick();
        expect(field('columns').element.value).toBe('2');
        expect(field('rows').element.value).toBe('2');
        expect(field('epochs').element.value).toBe('3');

        await start().trigger('click');

        expect(SpeciesStore.split).toHaveBeenCalledExactlyOnceWith({ cell: { x: 1, y: 0 }, width: 2, height: 2, epochs: 3 });
    });

    test('uses what was typed, as numbers, and the species is the one opened even if the selection moved', async () => {
        open({ x: 1, y: 0 });
        await wrapper.vm.$nextTick();
        SpeciesStore.selected = { x: 0, y: 1 };
        await field('columns').setValue('3');
        await field('rows').setValue('1');
        await field('epochs').setValue('5');

        await start().trigger('click');

        expect(SpeciesStore.split).toHaveBeenCalledExactlyOnceWith({ cell: { x: 1, y: 0 }, width: 3, height: 1, epochs: 5 });
    });

    test.each([
        ['columns', '0', 'Columns and rows are whole numbers from 1 to 6.'],
        ['columns', '7', 'Columns and rows are whole numbers from 1 to 6.'],
        ['rows', '1.5', 'Columns and rows are whole numbers from 1 to 6.'],
        ['epochs', '0', 'Epochs must be a whole number of at least 1.'],
    ])('does not start with %s %s', async (name, value, message) => {
        open();
        await field(name).setValue(value);

        expect(wrapper.get('[data-testid="split-invalid"]').text()).toBe(message);
        expect(start().attributes('disabled')).toBeDefined();
        await start().trigger('click');
        expect(SpeciesStore.split).not.toHaveBeenCalled();
    });

    test('a single sub-species is not a split', async () => {
        open();
        await field('columns').setValue('1');
        await field('rows').setValue('1');

        expect(wrapper.get('[data-testid="split-invalid"]').text()).toBe('The map needs at least 2 sub-species.');
    });

    test('says how many flowers the map needs when the species has fewer, 3 for every sub-species', async () => {
        open({ x: 0, y: 1 });
        await wrapper.vm.$nextTick();

        // 5 flowers, and 2 x 2 needs 12
        expect(wrapper.get('[data-testid="split-invalid"]').text()).toBe('Slender Iris has 5 flowers, and a map of 2 x 2 needs 12. Use fewer sub-species.');
        await field('rows').setValue('1');
        expect(wrapper.get('[data-testid="split-invalid"]').text()).toContain('needs 6');
        await field('columns').setValue('1');
        await field('rows').setValue('1');
        await field('rows').setValue('2');
        expect(start().attributes('disabled')).toBeDefined();
    });

    test('12 flowers are enough for 4 sub-species', async () => {
        open({ x: 1, y: 0 });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid="split-invalid"]').exists()).toBe(false);
        expect(start().attributes('disabled')).toBeUndefined();
    });

    describe('the progress', () => {
        test('is not there before a split, and not for the run of a fine-tune', async () => {
            open();
            SpeciesStore.training.kind = 'fineTune';
            SpeciesStore.training.ran = 'fineTune';
            SpeciesStore.training.result = { outcome: 'done', message: 'Done. All good.' };
            await wrapper.vm.$nextTick();

            expect(wrapper.find('[data-testid="training-panel"]').exists()).toBe(false);
        });

        test('is there while it runs, and then only Cancel works: it cannot be started again or closed', async () => {
            open();
            SpeciesStore.training.kind = 'split';
            SpeciesStore.training.ran = 'split';
            SpeciesStore.training.phase = 'training';
            SpeciesStore.training.done = 1;
            SpeciesStore.training.total = 3;
            await wrapper.vm.$nextTick();

            expect(wrapper.find('[data-testid="training-panel"]').exists()).toBe(true);
            expect(start().attributes('disabled')).toBeDefined();
            expect(close().attributes('disabled')).toBeDefined();
            await wrapper.get('[data-testid="training-cancel"]').trigger('click');
            expect(SpeciesStore.cancelTraining).toHaveBeenCalledOnce();
        });

        test('stays with how it ended, and the dialog can be closed', async () => {
            open();
            SpeciesStore.training.ran = 'split';
            SpeciesStore.training.result = { outcome: 'done', message: 'Done: Ruffled Aster is now 4 sub-species.' };
            await wrapper.vm.$nextTick();

            expect(wrapper.get('[data-testid="training-result"]').text()).toBe('Done: Ruffled Aster is now 4 sub-species.');
            await close().trigger('click');
            expect(dialog().open).toBe(false);
        });

        test('Esc does not close it while it runs', async () => {
            open();
            SpeciesStore.training.kind = 'split';
            SpeciesStore.training.ran = 'split';
            const escape = new Event('cancel', { cancelable: true });

            dialog().dispatchEvent(escape);
            expect(escape.defaultPrevented).toBe(true);

            SpeciesStore.training.kind = null;
            const again = new Event('cancel', { cancelable: true });
            dialog().dispatchEvent(again);
            expect(again.defaultPrevented).toBe(false);
        });
    });
});
