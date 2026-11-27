// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import AppActions from '../../../src/components/AppActions.vue';
import { useSpeciesStore } from '../../../src/stores/SpeciesStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import * as flowerRepository from '../../../src/repositories/flowerRepository';

// The three workers and LocalFlowerStore are what the rest of this component is about, here it is only the
// button of the Danger Zone for the fine-tuned classifier.
vi.mock('../../../src/workers/redraw.worker?worker', () => ({ default: () => ({ postMessage: () => {}, terminate: () => {} }) }));
vi.mock('../../../src/workers/export.worker?worker', () => ({ default: () => ({ postMessage: () => {}, terminate: () => {} }) }));
vi.mock('../../../src/workers/import.worker?worker', () => ({ default: () => ({ postMessage: () => {}, terminate: () => {} }) }));
vi.mock('../../../src/services/speciesWorker', () => ({
    getSpeciesClient: vi.fn(),
}));
vi.mock('../../../src/repositories/flowerRepository', () => ({
    countFlowers: vi.fn(),
    countFavourites: vi.fn(),
}));
const localFlowerStore = vi.hoisted(() => ({}));
vi.mock('../../../src/stores/LocalFlowerStore', () => ({
    useLocalFlowerStore: () => localFlowerStore,
}));

describe('AppActions, the fine-tuned classifier', () => {
    let SpeciesStore;
    let emitter;

    const mountActions = () => mount(AppActions, {
        global: { provide: { emitter }, stubs: { UploadFileModal: true } },
    });
    const button = (wrapper) => wrapper.get('[data-testid="remove-classifier"]');

    beforeEach(() => {
        localFlowerStore.deleteAllFlowers = vi.fn();
        localFlowerStore.deleteNonFavourites = vi.fn();
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

describe('AppActions, the actions that need to know how many flowers there are', () => {
    let emitter;
    let ErrorStore;

    const mountActions = () => mount(AppActions, {
        global: { provide: { emitter }, stubs: { UploadFileModal: true } },
    });
    const buttonWith = (wrapper, text) => wrapper.findAll('button').find((b) => b.text() === text);
    // clicks the button, answers yes to the question and waits for what that starts
    const confirm = async (text) => {
        await buttonWith(mountActions(), text).trigger('click');
        const [, question] = emitter.emit.mock.calls.find(([name]) => name === 'showYesNo');
        question.onConfirm();
        await vi.waitFor(() => expect(flowerRepository.countFlowers.mock.calls.length
            + flowerRepository.countFavourites.mock.calls.length).toBeGreaterThan(0));
        await Promise.resolve();
    };
    const progress = () => emitter.emit.mock.calls.filter(([name]) => name === 'showProgress').map(([, o]) => o);

    beforeEach(() => {
        createTestingPinia({ createSpy: vi.fn });
        ErrorStore = useErrorStore();
        emitter = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
        flowerRepository.countFlowers.mockReset();
        flowerRepository.countFavourites.mockReset();
    });

    test.each([
        ['Redraw local Flowers', 're-drawing flowers', 'countFlowers', 'countFavourites'],
        ['Export local Flowers', 'exporting flowers', 'countFlowers', 'countFavourites'],
        ['Export favourite flowers', 'exporting favourite flowers', 'countFavourites', 'countFlowers'],
    ])('%s shows the progress for the flowers it counts, and only those', async (text, title, counted, other) => {
        flowerRepository[counted].mockResolvedValue(12);

        await confirm(text);

        expect(progress()).toMatchObject([{ title, total: 12, progress: 0 }]);
        expect(flowerRepository[other]).not.toHaveBeenCalled();
        expect(ErrorStore.push).not.toHaveBeenCalled();
    });

    test.each([
        ['Redraw local Flowers', 'countFlowers', 'You have no local flowers to redraw.'],
        ['Export local Flowers', 'countFlowers', 'You have no flowers to export'],
        ['Export favourite flowers', 'countFavourites', 'You have no favourites to export'],
    ])('%s says so when there is nothing to do', async (text, counted, message) => {
        flowerRepository[counted].mockResolvedValue(0);

        await confirm(text);

        expect(progress()).toEqual([]);
        expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith(message);
    });

    test.each([
        ['Redraw local Flowers', 'countFlowers'],
        ['Export local Flowers', 'countFlowers'],
        ['Export favourite flowers', 'countFavourites'],
    ])('%s reports a table that cannot be read', async (text, counted) => {
        const failure = new Error('cannot read the table');
        flowerRepository[counted].mockRejectedValue(failure);

        await confirm(text);
        await vi.waitFor(() => expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith(failure));

        expect(progress()).toEqual([]);
    });
});

describe('AppActions, the Danger Zone', () => {
    let emitter;

    const mountActions = () => mount(AppActions, {
        global: { provide: { emitter }, stubs: { UploadFileModal: true } },
    });
    const buttonWith = (wrapper, text) => wrapper.findAll('button').find((b) => b.text() === text);
    const question = () => emitter.emit.mock.calls.find(([name]) => name === 'showYesNo')[1];

    beforeEach(() => {
        localFlowerStore.deleteAllFlowers = vi.fn();
        localFlowerStore.deleteNonFavourites = vi.fn();
        createTestingPinia({ createSpy: vi.fn });
        emitter = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
    });

    test.each([
        ['Delete All Flowers', 'deleteAllFlowers', 'deleteNonFavourites'],
        ['Delete non Favourites', 'deleteNonFavourites', 'deleteAllFlowers'],
    ])('%s asks first, and when it is confirmed deletes and tells the options to count the space again', async (text, action, other) => {
        await buttonWith(mountActions(), text).trigger('click');
        expect(localFlowerStore[action]).not.toHaveBeenCalled();

        await question().onConfirm();

        expect(localFlowerStore[action]).toHaveBeenCalledTimes(1);
        expect(localFlowerStore[other]).not.toHaveBeenCalled();
        expect(emitter.emit).toHaveBeenLastCalledWith('AppOptions#recalcSpace');
    });

    test('the space is counted after the flowers are deleted, not before', async () => {
        let finish;
        localFlowerStore.deleteAllFlowers = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
        await buttonWith(mountActions(), 'Delete All Flowers').trigger('click');

        const done = question().onConfirm();
        await Promise.resolve();
        expect(emitter.emit).not.toHaveBeenCalledWith('AppOptions#recalcSpace');

        finish();
        await done;
        expect(emitter.emit).toHaveBeenCalledWith('AppOptions#recalcSpace');
    });
});
