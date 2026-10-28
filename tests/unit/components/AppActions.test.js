// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import AppActions from '../../../src/components/AppActions.vue';
import { useSpeciesStore } from '../../../src/stores/SpeciesStore';

// The three workers and FlowerStore are what the rest of this component is about, here it is only the
// button of the Danger Zone for the fine-tuned classifier.
vi.mock('../../../src/workers/redraw.worker?worker', () => ({ default: () => ({ postMessage: () => {}, terminate: () => {} }) }));
vi.mock('../../../src/workers/export.worker?worker', () => ({ default: () => ({ postMessage: () => {}, terminate: () => {} }) }));
vi.mock('../../../src/workers/import.worker?worker', () => ({ default: () => ({ postMessage: () => {}, terminate: () => {} }) }));
vi.mock('../../../src/services/speciesWorker', () => ({
    getSpeciesClient: vi.fn(),
}));
vi.mock('../../../src/stores/FlowerStore', () => ({
    useFlowerStore: () => ({ settings: {}, deleteAllFlowers: vi.fn(), deleteNonFavourites: vi.fn() }),
    STORAGE_KEY_GARDEN: 'garden',
}));

describe('AppActions, the fine-tuned classifier', () => {
    let SpeciesStore;
    let emitter;

    const mountActions = () => mount(AppActions, {
        global: { provide: { emitter }, stubs: { UploadFileModal: true } },
    });
    const button = (wrapper) => wrapper.get('[data-testid="remove-classifier"]');

    beforeEach(() => {
        createTestingPinia({ createSpy: vi.fn });
        SpeciesStore = useSpeciesStore();
        emitter = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
    });

    test('is in the Danger Zone, and asks what is saved when it is shown, without starting the classifier', () => {
        const wrapper = mountActions();

        expect(wrapper.get('#actions-danger').find('[data-testid="remove-classifier"]').exists()).toBe(true);
        expect(SpeciesStore.loadSaved).toHaveBeenCalledTimes(1);
        expect(SpeciesStore.start).not.toHaveBeenCalled();
    });

    test('cannot be used when there is no fine-tuned classifier', () => {
        SpeciesStore.hasTuned = false;
        expect(button(mountActions()).element.disabled).toBe(true);
    });

    test('can be used when there is one', () => {
        SpeciesStore.hasTuned = true;
        expect(button(mountActions()).element.disabled).toBe(false);
    });

    test('follows what is saved, which is only known once it was read', async () => {
        const wrapper = mountActions();
        expect(button(wrapper).element.disabled).toBe(true);

        SpeciesStore.hasTuned = true;
        await wrapper.vm.$nextTick();

        expect(button(wrapper).element.disabled).toBe(false);
    });

    test('cannot be used while it is being fine-tuned', () => {
        SpeciesStore.hasTuned = true;
        SpeciesStore.training.kind = 'fineTune';
        expect(button(mountActions()).element.disabled).toBe(true);
    });

    test('asks before it removes it, and removes it when it is confirmed', async () => {
        SpeciesStore.hasTuned = true;

        await button(mountActions()).trigger('click');
        expect(SpeciesStore.resetClassifier).not.toHaveBeenCalled();
        const [event, question] = emitter.emit.mock.calls.find(([name]) => name === 'showYesNo');
        expect(event).toBe('showYesNo');
        await question.onConfirm();

        expect(SpeciesStore.resetClassifier).toHaveBeenCalledTimes(1);
    });
});
