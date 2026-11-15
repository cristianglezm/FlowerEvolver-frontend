// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { reactive, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import FlowersTable from '../../../src/components/FlowersTable.vue';

// A card is a lot of components and stores, the table only gives it the flower. There is no pinia here on
// purpose: the table is a list, what is shown on it is for the view that owns the list to look after.
vi.mock('../../../src/components/FlowerCard.vue', () => ({
    default: {
        props: ['id', 'genome', 'image', 'isLocal'],
        template: '<div class="card" :data-id="id" :data-genome="genome" :data-image="image" :data-local="isLocal" />',
    },
}));

const flowers = (...ids) => ids.map((id) => ({ id, genome: `g${id}`, image: `i${id}` }));

describe('FlowersTable', () => {
    const mountTable = (list, isLocal = true) => mount(FlowersTable, {
        props: { flowers: list, isLocal, noFlowerMessage: 'There are no Flowers' },
    });

    test('shows a card for each flower, in the order of the list', () => {
        expect(mountTable(flowers(3, 1, 2)).findAll('.card').map((card) => card.attributes('data-id'))).toEqual(['3', '1', '2']);
    });

    test('gives each card its flower and whether it is of the browser', () => {
        const [local] = mountTable(flowers(7), true).findAll('.card');
        expect(local.attributes()).toMatchObject({ 'data-id': '7', 'data-genome': 'g7', 'data-image': 'i7', 'data-local': 'true' });

        const [remote] = mountTable(flowers(7), false).findAll('.card');
        expect(remote.attributes('data-local')).toBe('false');
    });

    test('says there are no flowers, with the message it was given, and has no cards', () => {
        const wrapper = mountTable([]);

        expect(wrapper.text()).toBe('There are no Flowers');
        expect(wrapper.findAll('.card')).toHaveLength(0);
    });

    test('follows the list it was given as flowers are added to it, as infinite scroll does', async () => {
        const list = reactive(flowers(1, 2));
        const wrapper = mountTable(list);

        list.push(...flowers(3, 4));
        await nextTick();

        expect(wrapper.findAll('.card').map((card) => card.attributes('data-id'))).toEqual(['1', '2', '3', '4']);
    });
});
