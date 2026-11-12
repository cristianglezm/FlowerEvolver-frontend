// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import LastAdded from '../../../src/views/LastAdded.vue';
import { useFlowerStore } from '../../../src/stores/FlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import * as listEvents from '../../../src/services/listEvents';
import { flowerAdded } from '../../../src/services/listEvents';
import * as flowerApiClient from '../../../src/services/flowerApiClient';

const server = vi.hoisted(() => ({ rows: [], seq: 0, offline: false }));
vi.mock('../../../src/services/flowerApiClient', () => {
    const create = () => {
        const id = ++server.seq;
        const flower = { id, genome: `${id}.json`, image: `${id}.png` };
        server.rows.push(flower);
        return flower;
    };
    return {
        API: 'http://test-api.local/',
        mapAxiosError: vi.fn((e, offlineMessage) => offlineMessage),
        getFlowers: vi.fn(async ({ limit, offset }) => {
            if(server.offline){
                throw { response: undefined };
            }
            return [...server.rows].reverse().slice(offset, offset + limit);
        }),
        createFlower: vi.fn(async () => create()),
    };
});
vi.mock('../../../src/services/flowerRepository', () => ({ ensureOpen: vi.fn() }));
vi.mock('../../../src/services/speciesRepository', () => ({}));
vi.mock('../../../src/stores/SpeciesStore', () => ({ useSpeciesStore: () => ({}) }));
vi.mock('../../../src/components/FlowersTable.vue', () => ({
    default: {
        props: ['flowers', 'isLocal', 'noFlowerMessage'],
        template: '<ul class="flowers"><li v-for="flower in flowers" :key="flower.id">{{ flower.id }}</li><li v-if="!flowers.length" class="none">{{ noFlowerMessage }}</li></ul>',
    },
}));

describe('LastAdded view', () => {
    let FlowerStore;
    let ErrorStore;
    let wrapper;

    const addRows = (count) => {
        for(let i = 0; i < count; ++i){
            const id = ++server.seq;
            server.rows.push({ id, genome: `${id}.json`, image: `${id}.png` });
        }
    };
    const mountView = async () => {
        wrapper = mount(LastAdded);
        await flushPromises();
    };
    const shown = () => wrapper.findAll('.flowers li:not(.none)').map((li) => Number(li.text()));
    // the real timers of the promises are needed: only the interval is faked
    const tick = async (ms) => {
        vi.advanceTimersByTime(ms);
        await flushPromises();
        await nextTick();
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
        server.rows = [];
        server.seq = 0;
        server.offline = false;
        createTestingPinia({ stubActions: false, createSpy: vi.fn });
        FlowerStore = useFlowerStore();
        ErrorStore = useErrorStore();
        vi.spyOn(ErrorStore, 'push');
    });

    afterEach(() => {
        wrapper?.unmount();
        wrapper = undefined;
        vi.useRealTimers();
    });

    test('shows the 30 last flowers that were added to the server, the newest first', async () => {
        addRows(35);

        await mountView();

        expect(flowerApiClient.getFlowers).toHaveBeenCalledExactlyOnceWith({ limit: 30, offset: 0 });
        expect(shown()).toHaveLength(30);
        expect(shown().slice(0, 3)).toEqual([35, 34, 33]);
    });

    test('says that there are no flowers', async () => {
        await mountView();

        expect(wrapper.get('.none').text()).toBe('There are no Flowers');
    });

    test('is read again every 30 seconds', async () => {
        addRows(2);
        await mountView();

        addRows(1);
        await tick(29999);
        expect(shown()).toEqual([2, 1]);
        await tick(1);
        expect(shown()).toEqual([3, 2, 1]);

        addRows(1);
        await tick(30000);
        expect(shown()).toEqual([4, 3, 2, 1]);
    });

    test('a flower that is made from here is at the top at once', async () => {
        addRows(2);
        await mountView();

        await FlowerStore.makeRemoteFlower();
        await flushPromises();

        expect(shown()).toEqual([3, 2, 1]);
    });

    test('and it is not shown twice when the next reading has it', async () => {
        addRows(2);
        await mountView();
        await FlowerStore.makeRemoteFlower();
        await flushPromises();

        await tick(30000);

        expect(shown()).toEqual([3, 2, 1]);
    });

    test('a flower that is announced when it is in the list already is not added again', async () => {
        addRows(2);
        await mountView();

        flowerAdded('lastAdded', { id: 2, genome: '2.json', image: '2.png' });
        await nextTick();

        expect(shown()).toEqual([2, 1]);
    });

    test('a server that is offline is not an error to show: the list stays as it was', async () => {
        addRows(2);
        await mountView();

        server.offline = true;
        await tick(30000);
        await tick(30000);

        expect(shown()).toEqual([2, 1]);
        expect(ErrorStore.push).not.toHaveBeenCalled();
    });

    test('stops listening to the list when the view is gone', async () => {
        const stop = vi.fn();
        vi.spyOn(listEvents, 'listenToList').mockReturnValue(stop);
        await mountView();
        expect(stop).not.toHaveBeenCalled();

        wrapper.unmount();
        wrapper = undefined;

        expect(listEvents.listenToList).toHaveBeenCalledExactlyOnceWith('lastAdded', expect.any(Object));
        expect(stop).toHaveBeenCalledTimes(1);
        vi.restoreAllMocks();
    });

    test('without the view the server is not asked again and what is made is not its business', async () => {
        addRows(2);
        await mountView();
        flowerApiClient.getFlowers.mockClear();

        wrapper.unmount();
        wrapper = undefined;
        await tick(90000);
        await FlowerStore.makeRemoteFlower();
        await flushPromises();

        expect(flowerApiClient.getFlowers).not.toHaveBeenCalled();
    });
});
