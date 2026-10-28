// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { markRaw, reactive, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory } from 'vue-router';
import Species from '../../../src/views/Species.vue';
import { useSpeciesStore } from '../../../src/stores/SpeciesStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { SpeciesModel } from '../../../src/services/SpeciesModel';
import * as speciesRepository from '../../../src/services/speciesRepository';
import * as flowerRepository from '../../../src/services/flowerRepository';
import { classifierJson } from '../helpers/classifier';

// What is under test is the view: what it asks of the store and the tables and what it shows. A flower
// card is a lot of components and stores, and the settings are all it takes from FlowerStore.
vi.mock('../../../src/components/FlowersTable.vue', () => ({
    default: {
        props: ['flowers', 'isLocal', 'noFlowerMessage'],
        template: '<ul class="flowers"><li v-for="flower in flowers" :key="flower.id">{{ flower.id }}</li><li v-if="!flowers.length">{{ noFlowerMessage }}</li></ul>',
    },
}));
vi.mock('../../../src/services/speciesWorker', () => ({
    getSpeciesClient: vi.fn(),
}));
vi.mock('../../../src/services/speciesRepository', () => ({
    countByCell: vi.fn(),
    listFlowerIdsByCell: vi.fn(),
}));
vi.mock('../../../src/services/flowerRepository', () => ({
    bulkGetFlowers: vi.fn(),
}));
const flowerStore = vi.hoisted(() => ({}));
vi.mock('../../../src/stores/FlowerStore', () => ({
    useFlowerStore: () => flowerStore,
}));

const page = { template: '<div />' };
// the dialog is tested on its own, here it is only opened
const openDialog = vi.fn();
const FineTuneModalStub = {
    setup(_, { expose }){
        expose({ open: openDialog });
        return () => null;
    },
};
const openSplit = vi.fn();
const SplitModalStub = {
    setup(_, { expose }){
        expose({ open: openSplit });
        return () => null;
    },
};

describe('Species view', () => {
    let emitter;
    let SpeciesStore;
    let ErrorStore;
    let router;
    let getContext;

    const counts = (entries) => new Map(Object.entries(entries));
    const mountView = async (path = '/Species') => {
        await router.push(path);
        const wrapper = mount(Species, {
            global: { plugins: [router], provide: { emitter }, stubs: { FineTuneModal: FineTuneModalStub, SplitModal: SplitModalStub } },
        });
        await flushPromises();
        return wrapper;
    };
    const card = (wrapper, x, y) => wrapper.get(`[data-testid="species-card-${x}-${y}"]`);
    const shownFlowers = (wrapper) => wrapper.findAll('.flowers li').map((li) => li.text());

    beforeEach(async () => {
        getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        vi.clearAllMocks();
        emitter = { emit: vi.fn() };
        flowerStore.settings = reactive({ pagination: false, limit: 10 });
        flowerStore.localSelected = reactive({ index: 0, flowers: [] });
        flowerStore.selectLocalFlower = vi.fn((flower) => {
            flowerStore.localSelected.flowers[flowerStore.localSelected.index] = flower.id;
            flowerStore.localSelected.index = (flowerStore.localSelected.index + 1) % 2;
        });
        flowerStore.calcOffset = (p) => p * flowerStore.settings.limit;
        flowerStore.increaseOffset = (offset) => offset + flowerStore.settings.limit;
        speciesRepository.countByCell.mockResolvedValue(0);
        speciesRepository.listFlowerIdsByCell.mockResolvedValue([]);
        flowerRepository.bulkGetFlowers.mockImplementation(async (ids) => ids.map((id) => ({ id, genome: 'g', image: 'i' })));

        createTestingPinia({ createSpy: vi.fn });
        SpeciesStore = useSpeciesStore();
        ErrorStore = useErrorStore();
        // what start() leaves, the actions are stubs
        SpeciesStore.model = markRaw(SpeciesModel.fromJson(classifierJson()));
        SpeciesStore.fp = 'fp1';
        SpeciesStore.summary = { counts: counts({ '1,0': 3, '0,1': 1 }), classified: 4, atypicalAbove: null, atypical: 0 };

        router = createRouter({
            history: createMemoryHistory(),
            routes: [{ path: '/Species', name: 'Species', component: page }],
        });
    });

    afterEach(() => {
        getContext.mockRestore();
    });

    describe('starting', () => {
        test('starts the classifier, reads the summary, and classifies what is left once the list is shown', async () => {
            const order = [];
            SpeciesStore.start.mockImplementation(async () => order.push('start'));
            SpeciesStore.refreshSummary.mockImplementation(async () => order.push('summary'));
            speciesRepository.listFlowerIdsByCell.mockImplementation(async () => {
                order.push('list');
                return [];
            });
            SpeciesStore.classifyStale.mockImplementation(async () => order.push('classifyStale'));
            SpeciesStore.select.mockImplementation((cell) => {
                SpeciesStore.selected = cell;
            });

            await mountView();

            expect(order).toEqual(['start', 'summary', 'list', 'classifyStale']);
        });

        test('says it is starting until the classifier is in use', async () => {
            SpeciesStore.model = null;
            const wrapper = await mountView();
            expect(wrapper.find('[data-testid="species-loading"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="species-map"]').exists()).toBe(false);
        });

        test('says so and reports it when the classifier cannot start', async () => {
            const failure = new Error('worker failed');
            SpeciesStore.start.mockRejectedValue(failure);

            const wrapper = await mountView();

            expect(wrapper.find('[data-testid="species-error"]').exists()).toBe(true);
            expect(ErrorStore.push).toHaveBeenCalledWith(failure);
            expect(SpeciesStore.classifyStale).not.toHaveBeenCalled();
        });
    });

    describe('what it shows', () => {
        test('the map with how many flowers each species has', async () => {
            const wrapper = await mountView();

            expect(card(wrapper, 1, 0).get('[data-testid="species-card-count"]').text()).toBe('3');
            expect(card(wrapper, 0, 1).get('[data-testid="species-card-count"]').text()).toBe('1');
            expect(card(wrapper, 0, 0).get('[data-testid="species-card-count"]').text()).toBe('0');
        });

        test.each([
            [{ '1,0': 3, '0,1': 1 }, 4, 0, '4 flowers in 2 of 4 species'],
            [{ '1,0': 1 }, 1, 0, '1 flower in 1 of 4 species'],
            [{ '1,0': 3, '0,1': 1 }, 4, 2, '4 flowers in 2 of 4 species, 2 atypical'],
            [{}, 0, 0, '0 flowers in 0 of 4 species'],
        ])('the summary: %j', async (map, classified, atypical, text) => {
            SpeciesStore.summary = { counts: counts(map), classified, atypicalAbove: atypical > 0 ? 1 : null, atypical };

            const wrapper = await mountView();

            expect(wrapper.get('[data-testid="species-summary"]').text()).toBe(text);
        });

        test('how far the classification is while it works', async () => {
            SpeciesStore.status = 'classifying';
            SpeciesStore.progress = { done: 25, total: 60 };

            const wrapper = await mountView();

            expect(wrapper.get('[data-testid="species-progress"]').text()).toBe('Classifying your flowers: 25 of 60');
        });

        test('nothing about the classification when it is not working', async () => {
            expect((await mountView()).find('[data-testid="species-progress"]').exists()).toBe(false);
        });

        test('the species with no flowers can be left out', async () => {
            const wrapper = await mountView();
            expect(card(wrapper, 0, 0).exists()).toBe(true);

            await wrapper.get('[data-testid="species-hide-empty"]').setValue(true);

            expect(wrapper.find('[data-testid="species-card-0-0"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="species-card-1-0"]').exists()).toBe(true);
        });
    });

    describe('the classifier', () => {
        test('there is a button to fine-tune it, which opens the dialog', async () => {
            const wrapper = await mountView();

            await wrapper.get('[data-testid="species-finetune"]').trigger('click');

            expect(openDialog).toHaveBeenCalledTimes(1);
        });

        test('there is no way back to the built-in classifier when there is no fine-tuned one', async () => {
            SpeciesStore.hasTuned = false;
            expect((await mountView()).find('[data-testid="species-reset"]').exists()).toBe(false);
        });

        test('with a fine-tuned one there is, and it asks before it goes back', async () => {
            SpeciesStore.hasTuned = true;
            const wrapper = await mountView();

            await wrapper.get('[data-testid="species-reset"]').trigger('click');

            expect(SpeciesStore.resetClassifier).not.toHaveBeenCalled();
            expect(emitter.emit).toHaveBeenCalledWith('showYesNo', expect.objectContaining({ btnYes: 'Remove it' }));
        });

        test.each([
            ['it is being fine-tuned', { training: { kind: 'fineTune' } }],
            ['the flowers are being classified', { status: 'classifying' }],
        ])('the way back cannot be used while %s', async (_, change) => {
            SpeciesStore.hasTuned = true;
            Object.assign(SpeciesStore, change.training ? { training: { ...SpeciesStore.training, ...change.training } } : change);

            const wrapper = await mountView();

            expect(wrapper.get('[data-testid="species-reset"]').element.disabled).toBe(true);
        });

        describe('when it is replaced', () => {
            beforeEach(() => {
                SpeciesStore.select.mockImplementation((cell) => {
                    SpeciesStore.selected = cell;
                });
                SpeciesStore.selected = { x: 0, y: 1 };
            });

            test('the species that was selected is another one now: the busiest of the new one is selected and its flowers are read', async () => {
                const wrapper = await mountView();
                speciesRepository.listFlowerIdsByCell.mockClear();
                speciesRepository.listFlowerIdsByCell.mockResolvedValue([8]);

                SpeciesStore.summary = { counts: counts({ '1,1': 9, '0,0': 2 }), classified: 11, atypicalAbove: null, atypical: 0 };
                ++SpeciesStore.generation;
                await flushPromises();

                expect(SpeciesStore.select.mock.calls.slice(-2)).toEqual([[null], [{ x: 1, y: 1 }]]);
                expect(speciesRepository.listFlowerIdsByCell).toHaveBeenCalledWith(expect.objectContaining({ x: 1, y: 1, offset: 0 }));
                expect(shownFlowers(wrapper)).toEqual(['8']);
            });

            test('with no flowers, nothing is selected', async () => {
                const wrapper = await mountView();

                SpeciesStore.summary = { counts: new Map(), classified: 0, atypicalAbove: null, atypical: 0 };
                ++SpeciesStore.generation;
                await flushPromises();

                expect(SpeciesStore.selected).toBeNull();
                expect(wrapper.find('[data-testid="species-detail"]').exists()).toBe(false);
                expect(wrapper.find('[data-testid="species-hint"]').exists()).toBe(true);
            });

            test('nothing is done before the first list is here', async () => {
                SpeciesStore.start.mockImplementation(() => new Promise(() => {}));
                await router.push('/Species');
                mount(Species, { global: { plugins: [router], provide: { emitter }, stubs: { FineTuneModal: FineTuneModalStub } } });
                SpeciesStore.select.mockClear();

                ++SpeciesStore.generation;
                await flushPromises();

                expect(SpeciesStore.select).not.toHaveBeenCalled();
            });
        });
    });

    describe('the species that is selected', () => {
        beforeEach(() => {
            SpeciesStore.select.mockImplementation((cell) => {
                SpeciesStore.selected = cell;
            });
        });

        test('is the one with most flowers when nothing was selected, and its flowers are read once', async () => {
            await mountView();
            expect(SpeciesStore.select).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 0 });
            expect(speciesRepository.listFlowerIdsByCell).toHaveBeenCalledTimes(1);
            expect(speciesRepository.listFlowerIdsByCell).toHaveBeenCalledWith(expect.objectContaining({ x: 1, y: 0 }));
        });

        test('is the one nearest the top left when several have as many', async () => {
            SpeciesStore.summary = { counts: counts({ '1,1': 2, '0,1': 2, '1,0': 2 }), classified: 6, atypicalAbove: null, atypical: 0 };

            await mountView();

            expect(SpeciesStore.select).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 0 });
        });

        test('is kept when there already was one, the person may be coming back to it', async () => {
            SpeciesStore.selected = { x: 0, y: 1 };

            const wrapper = await mountView();

            expect(SpeciesStore.select).not.toHaveBeenCalled();
            expect(wrapper.get('[data-testid="species-detail-name"]').text()).toBe('Slender Iris (0, 1)');
        });

        test('is none, with a hint, when there are no flowers', async () => {
            SpeciesStore.summary = { counts: new Map(), classified: 0, atypicalAbove: null, atypical: 0 };

            const wrapper = await mountView();

            expect(SpeciesStore.select).not.toHaveBeenCalled();
            expect(wrapper.find('[data-testid="species-detail"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="species-hint"]').exists()).toBe(true);
            expect(wrapper.find('.flowers').exists()).toBe(false);
        });

        test('is chosen by a click on the map and on a similar species', async () => {
            SpeciesStore.selected = { x: 1, y: 0 };
            const wrapper = await mountView();

            await card(wrapper, 1, 1).trigger('click');
            expect(SpeciesStore.select).toHaveBeenLastCalledWith({ x: 1, y: 1 });

            await wrapper.get('[data-testid="species-similar-0-1"]').trigger('click');
            expect(SpeciesStore.select).toHaveBeenLastCalledWith({ x: 0, y: 1 });
        });
    });

    describe('the flowers of the species', () => {
        test('are the ones of the species of the classifier in use, newest first, as it is told', async () => {
            SpeciesStore.selected = { x: 1, y: 0 };
            speciesRepository.countByCell.mockResolvedValue(3);
            speciesRepository.listFlowerIdsByCell.mockResolvedValue([9, 7, 4]);

            const wrapper = await mountView();

            expect(speciesRepository.listFlowerIdsByCell).toHaveBeenCalledWith({ x: 1, y: 0, fp: 'fp1', limit: 10, offset: 0 });
            expect(flowerRepository.bulkGetFlowers).toHaveBeenCalledWith([9, 7, 4]);
            expect(shownFlowers(wrapper)).toEqual(['9', '7', '4']);
        });

        test('leave out the ones that were deleted since the list was read', async () => {
            SpeciesStore.selected = { x: 1, y: 0 };
            speciesRepository.listFlowerIdsByCell.mockResolvedValue([9, 7, 4]);
            flowerRepository.bulkGetFlowers.mockResolvedValue([{ id: 9 }, undefined, { id: 4 }]);

            expect(shownFlowers(await mountView())).toEqual(['9', '4']);
        });

        test('say so when the species has none', async () => {
            SpeciesStore.selected = { x: 0, y: 0 };
            expect(shownFlowers(await mountView())).toEqual(['There are no flowers of this species']);
        });

        test('start at the page of the address, when they come a page at a time', async () => {
            flowerStore.settings.pagination = true;
            SpeciesStore.selected = { x: 1, y: 0 };
            speciesRepository.countByCell.mockResolvedValue(25);

            await mountView('/Species?page=1');

            expect(speciesRepository.listFlowerIdsByCell).toHaveBeenCalledWith({ x: 1, y: 0, fp: 'fp1', limit: 10, offset: 10 });
            expect(speciesRepository.countByCell).toHaveBeenCalledWith({ x: 1, y: 0, fp: 'fp1' });
        });

        test('are read again from the start when another species is selected', async () => {
            SpeciesStore.selected = { x: 1, y: 0 };
            const wrapper = await mountView();
            speciesRepository.listFlowerIdsByCell.mockClear();
            speciesRepository.listFlowerIdsByCell.mockResolvedValue([2]);

            SpeciesStore.selected = { x: 0, y: 1 };
            await flushPromises();

            expect(speciesRepository.listFlowerIdsByCell).toHaveBeenCalledExactlyOnceWith({ x: 0, y: 1, fp: 'fp1', limit: 10, offset: 0 });
            expect(shownFlowers(wrapper)).toEqual(['2']);
        });

        test('are read again when the classification that was running is done, so the new ones are there', async () => {
            SpeciesStore.selected = { x: 1, y: 0 };
            SpeciesStore.status = 'classifying';
            const wrapper = await mountView();
            speciesRepository.listFlowerIdsByCell.mockClear();
            speciesRepository.listFlowerIdsByCell.mockResolvedValue([5, 4]);

            SpeciesStore.status = 'idle';
            await flushPromises();

            expect(shownFlowers(wrapper)).toEqual(['5', '4']);
        });

        test('are not read again when the status changes to something else', async () => {
            SpeciesStore.selected = { x: 1, y: 0 };
            await mountView();
            speciesRepository.listFlowerIdsByCell.mockClear();

            SpeciesStore.status = 'classifying';
            await nextTick();
            await flushPromises();

            expect(speciesRepository.listFlowerIdsByCell).not.toHaveBeenCalled();
        });

        test('a species is selected when the classification is done and none was', async () => {
            SpeciesStore.select.mockImplementation((cell) => {
                SpeciesStore.selected = cell;
            });
            SpeciesStore.summary = { counts: new Map(), classified: 0, atypicalAbove: null, atypical: 0 };
            SpeciesStore.status = 'classifying';
            await mountView();
            expect(SpeciesStore.select).not.toHaveBeenCalled();

            SpeciesStore.summary = { counts: counts({ '0,1': 5 }), classified: 5, atypicalAbove: null, atypical: 0 };
            SpeciesStore.status = 'idle';
            await flushPromises();

            expect(SpeciesStore.select).toHaveBeenCalledExactlyOnceWith({ x: 0, y: 1 });
        });
    });

    describe('using a species as a parent', () => {
        const useAsParent = (wrapper) => wrapper.get('[data-testid="species-use-as-parent"]').trigger('click');

        beforeEach(() => {
            SpeciesStore.selected = { x: 1, y: 0 };
            SpeciesStore.randomFlowerIn.mockResolvedValue(12);
        });

        test('the flower the store picks from the selected species is selected as a parent, and its species is read for the line', async () => {
            const wrapper = await mountView();

            await useAsParent(wrapper);
            await flushPromises();

            expect(SpeciesStore.randomFlowerIn).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 0 }, Math.random, null);
            expect(flowerStore.selectLocalFlower).toHaveBeenCalledExactlyOnceWith({ id: 12 });
            expect(SpeciesStore.ensureFor).toHaveBeenCalledWith([12]);
        });

        test('there is no line of parents until one is selected', async () => {
            const wrapper = await mountView();

            expect(wrapper.find('[data-testid="species-parents"]').exists()).toBe(false);
        });

        test('the line has the parents in the order they were chosen, with their species when it is known', async () => {
            SpeciesStore.rows = new Map([[12, { id: 12, x: 1, y: 0, d: 0.1, fp: 'fp1' }]]);
            const wrapper = await mountView();

            await useAsParent(wrapper);
            SpeciesStore.randomFlowerIn.mockResolvedValue(30);
            await useAsParent(wrapper);
            await flushPromises();

            expect(wrapper.get('[data-testid="species-parents"]').text()).toBe(
                'Parent 1: #12 (Ruffled Aster (1, 0)), Parent 2: #30'
            );
        });

        test('the line follows the flowers selected anywhere else too, and a third parent replaces the first', async () => {
            const wrapper = await mountView();

            flowerStore.selectLocalFlower({ id: 5 });
            flowerStore.selectLocalFlower({ id: 6 });
            flowerStore.selectLocalFlower({ id: 7 });
            await nextTick();

            expect(wrapper.get('[data-testid="species-parents"]').text()).toBe('Parent 1: #7, Parent 2: #6');
        });

        test('an empty species selects nothing', async () => {
            SpeciesStore.randomFlowerIn.mockResolvedValue(null);
            const wrapper = await mountView();

            await useAsParent(wrapper);
            await flushPromises();

            expect(flowerStore.selectLocalFlower).not.toHaveBeenCalled();
            expect(wrapper.find('[data-testid="species-parents"]').exists()).toBe(false);
        });

        test('a failure is reported and selects nothing', async () => {
            const failure = new Error('database closed');
            SpeciesStore.randomFlowerIn.mockRejectedValue(failure);
            const wrapper = await mountView();

            await useAsParent(wrapper);
            await flushPromises();

            expect(ErrorStore.push).toHaveBeenCalledWith(failure);
            expect(flowerStore.selectLocalFlower).not.toHaveBeenCalled();
        });
    });

    describe('sub-species', () => {
        const subModel = () => markRaw(SpeciesModel.fromJson(classifierJson({ width: '2', height: '1', toroidal: false, weights: [0, 0, 0, 0, 0, 1, 1, 1, 1, 0] })));
        const split = () => ({ model: subModel(), counts: new Map([['0,0', 2], ['1,0', 1]]), subfp: 'sub1' });
        const submap = { subfp: 'sub1', w: 2, h: 1, flowers: 3 };
        const subCard = (wrapper, x, y) => wrapper.get(`[data-testid="subspecies-card-${x}-${y}"]`);

        beforeEach(() => {
            SpeciesStore.selected = { x: 1, y: 0 };
        });

        test('there is no map of sub-species for a species that is not split', async () => {
            const wrapper = await mountView();

            expect(wrapper.find('[data-testid="subspecies-map"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="species-unsplit"]').exists()).toBe(false);
            expect(SpeciesStore.readSubspecies).toHaveBeenCalledWith({ x: 1, y: 0 });
        });

        test('the map of a split species is shown, with Remove the split on the detail', async () => {
            SpeciesStore.readSubspecies.mockResolvedValue(split());

            const wrapper = await mountView();

            expect(wrapper.get('[data-testid="subspecies-map"]').text()).toContain('Ruffled Aster: sub-species');
            expect(subCard(wrapper, 0, 0).get('[data-testid="subspecies-card-count"]').text()).toBe('2');
            expect(wrapper.find('[data-testid="species-unsplit"]').exists()).toBe(true);
        });

        test('the flowers made after the split are placed when it opens, and the map is read again', async () => {
            SpeciesStore.readSubspecies.mockResolvedValue(split());

            await mountView();

            expect(SpeciesStore.ensureSub).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 0 });
            expect(SpeciesStore.readSubspecies).toHaveBeenCalledTimes(2);
        });

        test('nothing is placed for a species that is not split', async () => {
            await mountView();

            expect(SpeciesStore.ensureSub).not.toHaveBeenCalled();
        });

        test('Split opens the dialog for the selected species', async () => {
            SpeciesStore.summary = { ...SpeciesStore.summary, counts: counts({ '1,0': 6 }) };
            const wrapper = await mountView();

            await wrapper.get('[data-testid="species-split"]').trigger('click');

            expect(openSplit).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 0 });
        });

        test('Remove the split asks first, and then removes it', async () => {
            SpeciesStore.readSubspecies.mockResolvedValue(split());
            SpeciesStore.unsplit.mockResolvedValue('done');
            const wrapper = await mountView();

            await wrapper.get('[data-testid="species-unsplit"]').trigger('click');

            expect(SpeciesStore.unsplit).not.toHaveBeenCalled();
            const question = emitter.emit.mock.calls.find(([name]) => name === 'showYesNo')[1];
            expect(question.message).toBe('Remove the sub-species of Ruffled Aster? The flowers stay in the species.');
            await question.onConfirm();
            expect(SpeciesStore.unsplit).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 0 });
            expect(ErrorStore.push).not.toHaveBeenCalled();
        });

        test('when it is busy it says so', async () => {
            SpeciesStore.readSubspecies.mockResolvedValue(split());
            SpeciesStore.unsplit.mockResolvedValue('busy');
            const wrapper = await mountView();

            await wrapper.get('[data-testid="species-unsplit"]').trigger('click');
            await emitter.emit.mock.calls.find(([name]) => name === 'showYesNo')[1].onConfirm();

            expect(ErrorStore.push.mock.calls[0][0].message).toBe('Your flowers are still being classified, try again in a moment.');
        });

        test('choosing a sub-species, and All of it, go to the store', async () => {
            SpeciesStore.readSubspecies.mockResolvedValue(split());
            const wrapper = await mountView();

            await subCard(wrapper, 1, 0).trigger('click');
            expect(SpeciesStore.selectSub).toHaveBeenLastCalledWith({ x: 1, y: 0 });

            SpeciesStore.selectedSub = { x: 1, y: 0 };
            await nextTick();
            await wrapper.get('[data-testid="subspecies-all"]').trigger('click');
            expect(SpeciesStore.selectSub).toHaveBeenLastCalledWith(null);
        });

        test('the flowers are the ones of the chosen sub-species, and are read again when it changes', async () => {
            flowerStore.settings.pagination = true;
            SpeciesStore.submaps = new Map([['1,0', submap]]);
            SpeciesStore.readSubspecies.mockResolvedValue(split());
            await mountView();
            expect(speciesRepository.listFlowerIdsByCell.mock.calls.at(-1)[0].sub).toBeUndefined();
            speciesRepository.listFlowerIdsByCell.mockClear();

            SpeciesStore.selectedSub = { x: 1, y: 0 };
            await nextTick();
            await flushPromises();

            expect(speciesRepository.listFlowerIdsByCell).toHaveBeenCalledWith(expect.objectContaining({
                x: 1, y: 0, fp: 'fp1', sub: { x: 1, y: 0, fp: 'sub1' },
            }));
            expect(speciesRepository.countByCell).toHaveBeenLastCalledWith(expect.objectContaining({ sub: { x: 1, y: 0, fp: 'sub1' } }));
        });

        test('a sub-species chosen for a species that is not split filters nothing', async () => {
            SpeciesStore.selectedSub = { x: 1, y: 0 };

            await mountView();

            expect(speciesRepository.listFlowerIdsByCell.mock.calls.at(-1)[0].sub).toBeUndefined();
        });

        test('the map follows the species being split or not: the sub-species are read when the maps change', async () => {
            const wrapper = await mountView();
            expect(wrapper.find('[data-testid="subspecies-map"]').exists()).toBe(false);

            SpeciesStore.readSubspecies.mockResolvedValue(split());
            SpeciesStore.submaps = new Map([['1,0', submap]]);
            await flushPromises();
            expect(wrapper.find('[data-testid="subspecies-map"]').exists()).toBe(true);

            SpeciesStore.readSubspecies.mockResolvedValue(null);
            SpeciesStore.submaps = new Map();
            await flushPromises();
            expect(wrapper.find('[data-testid="subspecies-map"]').exists()).toBe(false);
        });

        test('what is read for a species that is not selected anymore is dropped', async () => {
            const answers = [];
            SpeciesStore.readSubspecies.mockImplementation(() => new Promise((resolve) => {
                answers.push(resolve);
            }));
            const wrapper = await mountView();

            SpeciesStore.selected = { x: 0, y: 1 };
            await nextTick();
            // the answer for (1, 0), the first that was asked for
            answers[0](split());
            await flushPromises();

            expect(wrapper.find('[data-testid="subspecies-map"]').exists()).toBe(false);
        });

        test('the parent comes from the chosen sub-species, and the line has its letter', async () => {
            SpeciesStore.submaps = new Map([['1,0', submap]]);
            SpeciesStore.selectedSub = { x: 1, y: 0 };
            SpeciesStore.randomFlowerIn.mockResolvedValue(12);
            SpeciesStore.rows = new Map([[12, { id: 12, x: 1, y: 0, d: 0.1, fp: 'fp1', sx: 1, sy: 0, sfp: 'sub1' }]]);
            const wrapper = await mountView();

            await wrapper.get('[data-testid="species-use-as-parent"]').trigger('click');
            await flushPromises();

            expect(SpeciesStore.randomFlowerIn).toHaveBeenCalledWith({ x: 1, y: 0 }, Math.random, { x: 1, y: 0 });
            expect(wrapper.get('[data-testid="species-parents"]').text()).toBe('Parent 1: #12 (Ruffled Aster (1, 0) / b)');
        });
    });
});
