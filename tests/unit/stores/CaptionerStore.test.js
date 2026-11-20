import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useCaptionerStore } from '../../../src/stores/CaptionerStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import * as flowerRepository from '../../../src/services/flowerRepository';

// jsdom has no Worker implementation, and CaptionerStore creates its captioner
// worker as a module-level side effect on import - stub it out so the module
// can load at all under Vitest.
vi.mock('../../../src/workers/captioner.worker?worker', () => ({
	default: vi.fn(() => ({
		onmessage: null,
		onerror: null,
		postMessage: vi.fn(),
	})),
}));
vi.mock('../../../src/services/flowerRepository', () => ({
	addDescription: vi.fn(),
	listDescriptions: vi.fn(),
	bulkGetDescriptions: vi.fn(),
}));

describe('CaptionerStore', () => {
	let CaptionerStore;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false, createSpy: vi.fn });
		CaptionerStore = useCaptionerStore();
	});

	test('channel is a usable, non-reactive event emitter (not wrapped in a Pinia Proxy)', () => {
		expect(typeof CaptionerStore.channel.on).toBe('function');
		expect(typeof CaptionerStore.channel.emit).toBe('function');
		let received = null;
		CaptionerStore.channel.on('test#event', (payload) => { received = payload; });
		CaptionerStore.channel.emit('test#event', { ok: true });
		expect(received).toEqual({ ok: true });
	});

	test('loadLocalDescriptionsOf reads the descriptions of those flowers by id, and is done when they are in the store', async () => {
		// the second flower has none: it is asked for and not described
		flowerRepository.bulkGetDescriptions.mockResolvedValue([{ id: 4, description: 'a red flower' }, undefined, { id: 9, description: 'a tall one' }]);

		await CaptionerStore.loadLocalDescriptionsOf([4, 6, 9]);

		expect(flowerRepository.bulkGetDescriptions).toHaveBeenCalledExactlyOnceWith([4, 6, 9]);
		expect(CaptionerStore.getLocalDescription(4)).toBe('a red flower');
		expect(CaptionerStore.getLocalDescription(9)).toBe('a tall one');
		expect(CaptionerStore.localDescriptions.has(6)).toBe(false);
		expect(flowerRepository.listDescriptions).not.toHaveBeenCalled();
	});

	test('loadLocalDescriptionsOf keeps the descriptions that are loaded, and replaces one of the same flower', async () => {
		CaptionerStore.localDescriptions.set(1, 'first flower');
		CaptionerStore.localDescriptions.set(2, 'old text');
		flowerRepository.bulkGetDescriptions.mockResolvedValue([{ id: 2, description: 'new text' }, { id: 3, description: 'third flower' }]);

		await CaptionerStore.loadLocalDescriptionsOf([2, 3]);

		expect(CaptionerStore.getLocalDescription(1)).toBe('first flower');
		expect(CaptionerStore.getLocalDescription(2)).toBe('new text');
		expect(CaptionerStore.getLocalDescription(3)).toBe('third flower');
	});

	test('loadLocalDescriptionsOf has nothing to read for no flowers', async () => {
		await CaptionerStore.loadLocalDescriptionsOf([]);

		expect(flowerRepository.bulkGetDescriptions).not.toHaveBeenCalled();
	});

	test('loadLocalDescriptionsOf does not fail when the table cannot be read, it goes to the ErrorStore', async () => {
		const ErrorStore = useErrorStore();
		const failure = new Error('cannot read');
		flowerRepository.bulkGetDescriptions.mockRejectedValue(failure);

		await expect(CaptionerStore.loadLocalDescriptionsOf([1])).resolves.toBeUndefined();

		expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith(failure);
		expect(CaptionerStore.localDescriptions.size).toBe(0);
	});

	test('loadAndConcatLocalDescriptions reads the descriptions table by its own order, for the chatbot', async () => {
		flowerRepository.listDescriptions.mockResolvedValue([{ id: 1, description: 'a red flower' }]);

		await CaptionerStore.loadAndConcatLocalDescriptions(0, 10);
		await Promise.resolve();

		expect(flowerRepository.listDescriptions).toHaveBeenCalledWith({ offset: 0, limit: 10 });
		expect(CaptionerStore.getLocalDescription(1)).toBe('a red flower');
	});

	test('loadAndConcatLocalDescriptions merges into the existing map without dropping prior entries', async () => {
		CaptionerStore.localDescriptions.set(1, 'first flower');
		flowerRepository.listDescriptions.mockResolvedValue([{ id: 2, description: 'second flower' }]);

		await CaptionerStore.loadAndConcatLocalDescriptions(10, 10);
		await Promise.resolve();

		expect(CaptionerStore.getLocalDescription(1)).toBe('first flower');
		expect(CaptionerStore.getLocalDescription(2)).toBe('second flower');
	});

	test('hasModelOptionsChanged is true until model options have been snapshotted once', () => {
		expect(CaptionerStore.hasModelOptionsChanged).toBe(true);
		CaptionerStore.oldModelOptions = { ...CaptionerStore.modelOptions };
		expect(CaptionerStore.hasModelOptionsChanged).toBe(false);
	});
});
