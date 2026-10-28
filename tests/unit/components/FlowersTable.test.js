// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { reactive, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import FlowersTable from '../../../src/components/FlowersTable.vue';
import { useSpeciesStore } from '../../../src/stores/SpeciesStore';

// A card is a lot of components and stores, the table only gives it the flower.
vi.mock('../../../src/components/FlowerCard.vue', () => ({
    default: { props: ['id'], template: '<div class="card" :data-id="id" />' },
}));
vi.mock('../../../src/services/speciesWorker', () => ({
    getSpeciesClient: vi.fn(),
}));

const flowers = (...ids) => ids.map((id) => ({ id, genome: `g${id}`, image: `i${id}` }));

describe('FlowersTable', () => {
    let SpeciesStore;

    const mountTable = (list, isLocal = true) => mount(FlowersTable, {
        props: { flowers: list, isLocal, noFlowerMessage: 'There are no Flowers' },
    });

    beforeEach(() => {
        createTestingPinia({ createSpy: vi.fn });
        SpeciesStore = useSpeciesStore();
    });

    test('shows a card for each flower and the message when there are none', () => {
        expect(mountTable(flowers(3, 1, 2)).findAll('.card').map((card) => card.attributes('data-id'))).toEqual(['3', '1', '2']);
        expect(mountTable([]).text()).toBe('There are no Flowers');
    });

    describe('species of the flowers on screen', () => {
        test('are asked for when the table shows local flowers', () => {
            mountTable(flowers(3, 1, 2));
            expect(SpeciesStore.ensureFor).toHaveBeenCalledExactlyOnceWith([3, 1, 2]);
        });

        test('are not asked for the flowers of the server, they have none', () => {
            mountTable(flowers(3, 1, 2), false);
            expect(SpeciesStore.ensureFor).not.toHaveBeenCalled();
        });

        test('are not asked for when there is nothing to show', () => {
            mountTable([]);
            expect(SpeciesStore.ensureFor).not.toHaveBeenCalled();
        });

        test('are asked for only the flowers that were not on screen before, each flower once', async () => {
            const wrapper = mountTable(flowers(1, 2));

            await wrapper.setProps({ flowers: flowers(1, 2, 3, 4) });
            await wrapper.setProps({ flowers: flowers(4, 3, 2, 1) });
            await wrapper.setProps({ flowers: flowers(5) });

            expect(SpeciesStore.ensureFor.mock.calls.map(([ids]) => ids)).toEqual([[1, 2], [3, 4], [5]]);
        });

        test('are asked for the flowers that are added to the list it was given, as infinite scroll does', async () => {
            const list = reactive(flowers(1, 2));
            mountTable(list);

            list.push(...flowers(3, 4));
            await nextTick();

            expect(SpeciesStore.ensureFor.mock.calls.map(([ids]) => ids)).toEqual([[1, 2], [3, 4]]);
        });
    });
});
