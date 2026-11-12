import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useRemoteFlowerStore } from '../../../src/stores/RemoteFlowerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import * as flowerApiClient from '../../../src/services/flowerApiClient';
import { listenToList } from '../../../src/services/listEvents';

// The network is what is worth isolating here: the actions are run for real, and the lists are the real
// announcements, so what is checked is what the views would be told.
vi.mock('../../../src/services/flowerApiClient', () => ({
	mapAxiosError: vi.fn((e, offlineMessage) => (e.response === undefined ? offlineMessage : e.response.data)),
	getFlowersCount: vi.fn(),
	createFlower: vi.fn(),
	shareFlower: vi.fn(),
	reproduceRemote: vi.fn(),
	getMutationsCount: vi.fn(),
	mutateRemote: vi.fn(),
	getDescendantsCount: vi.fn(),
}));

describe('RemoteFlowerStore', () => {
	let RemoteFlowerStore;
	let ErrorStore;
	// the lists that hear about the remote flowers: what they were told, in order
	let toRemote;
	let toLastAdded;
	let toRemoteMutations;
	let toRemoteDescendants;
	let stopListening;

	beforeEach(() => {
		vi.clearAllMocks();
		toRemote = [];
		toLastAdded = [];
		toRemoteMutations = [];
		toRemoteDescendants = [];
		stopListening = [
			listenToList('remote', { added: (flower) => toRemote.push(flower) }),
			listenToList('lastAdded', { added: (flower) => toLastAdded.push(flower) }),
			listenToList('remoteMutations', { added: (flower, relation) => toRemoteMutations.push([flower, relation]) }),
			listenToList('remoteDescendants', { added: (flower, relation) => toRemoteDescendants.push([flower, relation]) }),
		];
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		RemoteFlowerStore = useRemoteFlowerStore();
		ErrorStore = useErrorStore();
		vi.spyOn(ErrorStore, 'push');
	});

	afterEach(() => {
		stopListening.forEach((stop) => stop());
	});

	describe('counts', () => {
		test('getRemoteDescendantsCount asks for one parent or for two, and returns 0 and records the error on failure', async () => {
			flowerApiClient.getDescendantsCount.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
			await expect(RemoteFlowerStore.getRemoteDescendantsCount(7)).resolves.toBe(4);
			await expect(RemoteFlowerStore.getRemoteDescendantsCount(7, 8)).resolves.toBe(2);
			expect(flowerApiClient.getDescendantsCount.mock.calls).toEqual([[7, undefined], [7, 8]]);

			const failure = new Error('offline');
			flowerApiClient.getDescendantsCount.mockRejectedValueOnce(failure);
			await expect(RemoteFlowerStore.getRemoteDescendantsCount(7)).resolves.toBe(0);
			expect(ErrorStore.push).toHaveBeenCalledWith(failure);
		});

		test('getRemoteFlowersCount returns the count, and 0 and records the error on failure', async () => {
			flowerApiClient.getFlowersCount.mockResolvedValueOnce(12);
			await expect(RemoteFlowerStore.getRemoteFlowersCount()).resolves.toBe(12);
			expect(ErrorStore.push).not.toHaveBeenCalled();

			const err = new Error('network down');
			flowerApiClient.getFlowersCount.mockRejectedValue(err);
			await expect(RemoteFlowerStore.getRemoteFlowersCount()).resolves.toBe(0);
			expect(ErrorStore.push).toHaveBeenCalledWith(err);
		});

		test('getRemoteMutationsCount asks for the mutations of the flower, and returns 0 and records the error on failure', async () => {
			flowerApiClient.getMutationsCount.mockResolvedValueOnce(3);
			await expect(RemoteFlowerStore.getRemoteMutationsCount(7)).resolves.toBe(3);
			expect(flowerApiClient.getMutationsCount).toHaveBeenCalledExactlyOnceWith(7);
			expect(ErrorStore.push).not.toHaveBeenCalled();

			const err = new Error('network down');
			flowerApiClient.getMutationsCount.mockRejectedValue(err);
			await expect(RemoteFlowerStore.getRemoteMutationsCount(7)).resolves.toBe(0);
			expect(ErrorStore.push).toHaveBeenCalledWith(err);
		});
	});

	describe('the selection', () => {
		test('nothing is selected at first', () => {
			expect(RemoteFlowerStore.getRemoteSelected).toEqual([]);
			expect(RemoteFlowerStore.isRemoteFlowerSelected({ id: 1 })).toBe(false);
		});

		test('the first two flowers selected are the pair, and one is not a pair yet', () => {
			RemoteFlowerStore.selectRemoteFlower({ id: 1 });
			expect(RemoteFlowerStore.getRemoteSelected).toEqual([1]);
			expect(RemoteFlowerStore.isRemoteFlowerSelected({ id: 1 })).toBe(false);

			RemoteFlowerStore.selectRemoteFlower({ id: 2 });
			expect(RemoteFlowerStore.getRemoteSelected).toEqual([1, 2]);
			expect(RemoteFlowerStore.isRemoteFlowerSelected({ id: 1 })).toBe(true);
			expect(RemoteFlowerStore.isRemoteFlowerSelected({ id: 2 })).toBe(true);
			expect(RemoteFlowerStore.isRemoteFlowerSelected({ id: 3 })).toBe(false);
		});

		test('the third flower takes the place of the first, the fourth the place of the second', () => {
			[1, 2, 3].forEach((id) => RemoteFlowerStore.selectRemoteFlower({ id }));
			expect(RemoteFlowerStore.getRemoteSelected).toEqual([3, 2]);
			expect(RemoteFlowerStore.isRemoteFlowerSelected({ id: 1 })).toBe(false);

			RemoteFlowerStore.selectRemoteFlower({ id: 4 });
			expect(RemoteFlowerStore.getRemoteSelected).toEqual([3, 4]);
		});
	});

	describe('remote actions and error mapping', () => {
		test('shareFlower sends the genome', async () => {
			flowerApiClient.shareFlower.mockResolvedValue();

			await RemoteFlowerStore.shareFlower('genome-json');

			expect(flowerApiClient.shareFlower).toHaveBeenCalledExactlyOnceWith('genome-json');
			expect(ErrorStore.push).not.toHaveBeenCalled();
		});

		test('shareFlower surfaces the offline message when the server is unreachable', async () => {
			flowerApiClient.shareFlower.mockRejectedValue({ response: undefined });

			await RemoteFlowerStore.shareFlower('genome-json');

			expect(flowerApiClient.mapAxiosError).toHaveBeenCalledWith({ response: undefined }, 'cannot share flower, server offline');
			expect(ErrorStore.push).toHaveBeenCalledWith('cannot share flower, server offline');
		});

		test('makeRemoteFlower announces the new flower to the remote flowers and to the last added', async () => {
			const flower = { id: 1, genome: 'g', image: 'i' };
			flowerApiClient.createFlower.mockResolvedValue(flower);

			await RemoteFlowerStore.makeRemoteFlower();

			expect(toRemote).toEqual([flower]);
			expect(toLastAdded).toEqual([flower]);
		});

		test('makeRemoteFlower announces nothing when the server cannot be reached', async () => {
			flowerApiClient.createFlower.mockRejectedValue({ response: undefined });

			await RemoteFlowerStore.makeRemoteFlower();

			expect(toRemote).toEqual([]);
			expect(toLastAdded).toEqual([]);
			expect(ErrorStore.push).toHaveBeenCalledWith('cannot make a remote flower, server offline');
		});

		test('makeRemoteMutation announces the mutation to the remote flowers and to the last added', async () => {
			const mutation = { id: 8, genome: 'g', image: 'i' };
			flowerApiClient.mutateRemote.mockResolvedValue(mutation);

			await RemoteFlowerStore.makeRemoteMutation({ id: 4 });

			expect(flowerApiClient.mutateRemote).toHaveBeenCalledWith(4);
			expect(toRemote).toEqual([mutation]);
			expect(toLastAdded).toEqual([mutation]);
			expect(toRemoteMutations).toEqual([[mutation, { original: 4 }]]);
		});

		test('makeRemoteMutation announces nothing when the server cannot be reached', async () => {
			flowerApiClient.mutateRemote.mockRejectedValue({ response: undefined });

			await RemoteFlowerStore.makeRemoteMutation({ id: 4 });

			expect(toRemote).toEqual([]);
			expect(toLastAdded).toEqual([]);
			expect(toRemoteMutations).toEqual([]);
			expect(ErrorStore.push).toHaveBeenCalledWith('cannot mutate a remote flower, server offline.');
		});

		test('remoteReproduce announces nothing when the server cannot be reached', async () => {
			RemoteFlowerStore.remoteSelected.flowers = [1, 2];
			flowerApiClient.reproduceRemote.mockRejectedValue({ response: undefined });

			await RemoteFlowerStore.remoteReproduce();

			expect(toRemote).toEqual([]);
			expect(toRemoteDescendants).toEqual([]);
			expect(ErrorStore.push).toHaveBeenCalledWith('cannot reproduce remote flowers, server offline.');
		});

		test('remoteReproduce requires two selected flowers before calling the API', async () => {
			RemoteFlowerStore.remoteSelected.flowers = [1];

			await RemoteFlowerStore.remoteReproduce();

			expect(ErrorStore.push).toHaveBeenCalledWith('There are no flowers selected');
			expect(flowerApiClient.reproduceRemote).not.toHaveBeenCalled();
		});

		test('remoteReproduce reproduces the two selected flowers', async () => {
			RemoteFlowerStore.remoteSelected.flowers = [1, 2];
			const child = { id: 3, genome: 'g', image: 'i' };
			flowerApiClient.reproduceRemote.mockResolvedValue(child);

			await RemoteFlowerStore.remoteReproduce();

			expect(flowerApiClient.reproduceRemote).toHaveBeenCalledWith(1, 2);
			expect(toRemote).toEqual([child]);
			expect(toLastAdded).toEqual([child]);
			expect(toRemoteDescendants).toEqual([[child, { father: 1, mother: 2 }]]);
		});
	});
});
