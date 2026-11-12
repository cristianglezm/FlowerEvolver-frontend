import { describe, test, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore, STORAGE_KEY } from '../../../src/stores/SettingsStore';

describe('SettingsStore', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
		setActivePinia(createPinia());
	});

	describe('the settings it starts with', () => {
		test('are the defaults when nothing was saved', () => {
			const { settings } = useSettingsStore();

			expect(settings).toEqual({
				params: { radius: 64, numLayers: 3, P: 6.0, bias: 1.0 },
				mutationRates: { addNodeRate: 0.2, addConnRate: 0.3, removeConnRate: 0.2, perturbWeightsRate: 0.6, enableRate: 0.35, disableRate: 0.3, actTypeRate: 0.4 },
				loadDemoFlowers: true,
				loadCaptionerModel: false,
				loadChatBotModel: false,
				loadKokoroModel: false,
				showChatBot: false,
				pagination: false,
				limit: 100,
				magnification: 4,
			});
		});

		test('are the ones that were saved, as they were saved', () => {
			const saved = {
				params: { radius: 32, numLayers: 2, P: 4.5, bias: 0.5 },
				mutationRates: { addNodeRate: 0.1, addConnRate: 0.1, removeConnRate: 0.1, perturbWeightsRate: 0.1, enableRate: 0.1, disableRate: 0.1, actTypeRate: 0.1 },
				loadDemoFlowers: false,
				loadCaptionerModel: true,
				loadChatBotModel: true,
				loadKokoroModel: true,
				showChatBot: true,
				pagination: true,
				limit: 24,
				magnification: 8,
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

			expect(useSettingsStore().settings).toEqual(saved);
		});

		test('have the default of what an older save does not have, and the saved value of the rest', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ limit: 24, pagination: true, loadDemoFlowers: false }));

			const { settings } = useSettingsStore();

			expect(settings.limit).toBe(24);
			expect(settings.pagination).toBe(true);
			expect(settings.loadDemoFlowers).toBe(false);
			expect(settings.magnification).toBe(4);
			expect(settings.params).toEqual({ radius: 64, numLayers: 3, P: 6.0, bias: 1.0 });
			expect(settings.mutationRates.addNodeRate).toBe(0.2);
		});

		test('have the default of a param or a rate that an older save does not have', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({
				params: { radius: 32, numLayers: 2 },
				mutationRates: { addNodeRate: 0.9 },
			}));

			const { settings } = useSettingsStore();

			expect(settings.params).toEqual({ radius: 32, numLayers: 2, P: 6.0, bias: 1.0 });
			expect(settings.mutationRates).toEqual({ addNodeRate: 0.9, addConnRate: 0.3, removeConnRate: 0.2, perturbWeightsRate: 0.6, enableRate: 0.35, disableRate: 0.3, actTypeRate: 0.4 });
		});

		test('keep a saved value that is false, 0 or empty, which is not a missing one', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ loadDemoFlowers: false, limit: 0, params: { P: 0, bias: 0 } }));

			const { settings } = useSettingsStore();

			expect(settings.loadDemoFlowers).toBe(false);
			expect(settings.limit).toBe(0);
			expect(settings.params.P).toBe(0);
			expect(settings.params.bias).toBe(0);
		});

		test('keep a setting that the defaults do not know', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ somethingNew: 7 }));

			expect(useSettingsStore().settings.somethingNew).toBe(7);
		});

		test('are the defaults when what was saved cannot be read, or is not an object', () => {
			const defaults = useSettingsStore().settings;
			for(const bad of ['{not json', 'null', '7', '[1,2]', '"text"']){
				localStorage.setItem(STORAGE_KEY, bad);
				setActivePinia(createPinia());

				expect(useSettingsStore().settings).toEqual(defaults);
			}
		});

		test('are the defaults when params or the rates were saved as something else', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ params: 5, mutationRates: [1, 2] }));

			const { settings } = useSettingsStore();

			expect(settings.params).toEqual({ radius: 64, numLayers: 3, P: 6.0, bias: 1.0 });
			expect(Object.keys(settings.mutationRates)).toHaveLength(7);
			expect(settings.mutationRates.addNodeRate).toBe(0.2);
		});

		test('are not shared: changing them does not change what the next store starts with', () => {
			const first = useSettingsStore();
			first.settings.params.radius = 999;
			first.settings.mutationRates.addNodeRate = 0.99;
			setActivePinia(createPinia());

			const { settings } = useSettingsStore();
			expect(settings.params.radius).toBe(64);
			expect(settings.mutationRates.addNodeRate).toBe(0.2);
		});

		test('are kept under the key that the application has always used', () => {
			expect(STORAGE_KEY).toBe('FlowerEvolverSettings');
		});
	});

	describe('saveSettings', () => {
		test('writes all of the settings under the key', async () => {
			const store = useSettingsStore();
			store.settings.limit = 7;
			store.settings.showChatBot = true;

			await store.saveSettings();

			expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(store.settings);
			expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).limit).toBe(7);
		});

		test('what it writes is what a new store starts with', async () => {
			const store = useSettingsStore();
			store.settings.params.radius = 128;
			store.settings.mutationRates.addNodeRate = 0.9;
			await store.saveSettings();

			setActivePinia(createPinia());

			expect(useSettingsStore().settings.params.radius).toBe(128);
			expect(useSettingsStore().settings.mutationRates.addNodeRate).toBe(0.9);
		});

		test('does not write until it is called', () => {
			const setItem = vi.spyOn(localStorage, 'setItem');
			const store = useSettingsStore();

			store.settings.limit = 5;

			expect(setItem).not.toHaveBeenCalled();
		});
	});

	describe('setLoadDemoFlowers', () => {
		test('sets it and saves it, once', async () => {
			const setItem = vi.spyOn(localStorage, 'setItem');
			const store = useSettingsStore();

			await store.setLoadDemoFlowers(false);

			expect(store.settings.loadDemoFlowers).toBe(false);
			expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).loadDemoFlowers).toBe(false);
			expect(setItem).toHaveBeenCalledTimes(1);
		});
	});

	describe('the offsets of the lists, which depend on how many flowers are in a page', () => {
		test.each([[1, 0, 1], [100, 100, 200], [25, 50, 75]])('with a limit of %i the offset that follows %i is %i', (limit, offset, expected) => {
			const store = useSettingsStore();
			store.settings.limit = limit;

			expect(store.increaseOffset(offset)).toBe(expected);
		});

		test('calcOffset is where a page starts', () => {
			const store = useSettingsStore();
			store.settings.limit = 24;

			expect(store.calcOffset(0)).toBe(0);
			expect(store.calcOffset(3)).toBe(72);
		});

		test('and they follow the limit when it changes', () => {
			const store = useSettingsStore();
			store.settings.limit = 10;
			expect(store.calcOffset(2)).toBe(20);

			store.settings.limit = 50;
			expect(store.calcOffset(2)).toBe(100);
			expect(store.increaseOffset(50)).toBe(100);
		});
	});
});
