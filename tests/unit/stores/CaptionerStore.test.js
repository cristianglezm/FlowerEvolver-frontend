import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useCaptionerStore } from '../../../src/stores/CaptionerStore';
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

	test('loadLocalDescriptions reads through flowerRepository, not FlowerStore.db', async () => {
		flowerRepository.listDescriptions.mockResolvedValue([{ id: 1, description: 'a red flower' }]);

		await CaptionerStore.loadLocalDescriptions(0, 10);
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
