// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { reactive, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import mitt from 'mitt';
import CaptionerModelOptions from '../../../src/components/CaptionerModelOptions.vue';

// Only the two buttons that depend on the model are looked at: the one that loads it, and the one for its cache. The
// model, the cache and the store are what decides, so they are what is replaced.
const model = vi.hoisted(() => ({ downloadedSize: 0 }));
const captionerStore = vi.hoisted(() => ({}));
vi.mock('../../../src/stores/CaptionerStore/Captioner', () => ({
	Captioner: { modelOptions: { model: 'Xenova/vit-gpt2-image-captioning' } },
	isGPUAvailable: () => false,
	CACHE_KEY: 'captioner-cache',
}));
vi.mock('../../../src/stores/CacheManager', () => ({
	CacheManager: class {
		size(){ return model.downloadedSize; }
		reload(){}
		hasFiles(){ return model.downloadedSize > 0; }
	},
}));
vi.mock('../../../src/stores/CaptionerStore', () => ({ useCaptionerStore: () => captionerStore }));

describe('CaptionerModelOptions, the buttons of the model', () => {
	let emitter;

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout'] });
		model.downloadedSize = 0;
		Object.assign(captionerStore, {
			modelOptions: reactive({ host: 'huggingface', model: '', device: 'CPU', encoder: 'fp32', decoder: 'q8' }),
			hasModelLoaded: false,
			hasModelOptionsChanged: false,
			saveModelOptions: vi.fn(),
		});
		emitter = mitt();
		vi.spyOn(emitter, 'emit');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const mountOptions = () => mount(CaptionerModelOptions, {
		global: { provide: { emitter }, stubs: { CacheManager: true } },
	});
	const buttonWith = (wrapper, text) => wrapper.findAll('button').find((button) => button.text().includes(text));

	describe('the button that loads the model', () => {
		test('can be used when the model is not loaded, and asks for it to be loaded', async () => {
			const wrapper = mountOptions();
			const button = buttonWith(wrapper, 'download / load model');

			expect(button.element.disabled).toBe(false);
			await button.trigger('click');

			expect(emitter.emit).toHaveBeenCalledWith('App#loadCaptionerModel');
		});

		test('is disabled for the browser when the model is loaded, and does nothing', async () => {
			captionerStore.hasModelLoaded = true;
			const wrapper = mountOptions();
			const button = buttonWith(wrapper, 'download / load model');

			expect(button.element.disabled).toBe(true);
			expect(button.attributes()).toHaveProperty('disabled');
			await button.trigger('click');

			expect(emitter.emit).not.toHaveBeenCalledWith('App#loadCaptionerModel');
		});

		test('can be used again when the options changed and the model has to be loaded again', async () => {
			captionerStore.hasModelLoaded = true;
			const wrapper = mountOptions();
			expect(buttonWith(wrapper, 'download / load model').element.disabled).toBe(true);

			emitter.emit('modelOptions#forceReload');
			await nextTick();

			expect(buttonWith(wrapper, 'download / load model').element.disabled).toBe(false);
		});

		test('says what it will do: download when there is no model, load when it is in the cache', async () => {
			let wrapper = mountOptions();
			vi.advanceTimersByTime(500);
			await nextTick();
			expect(buttonWith(wrapper, 'Model').text()).toBe('Download Model');
			wrapper.unmount();

			model.downloadedSize = 1;
			wrapper = mountOptions();
			vi.advanceTimersByTime(500);
			await nextTick();
			expect(buttonWith(wrapper, 'Load Model').text()).toBe('Load Model');
		});
	});

	describe('the button of the cache', () => {
		test('is disabled for the browser when nothing is downloaded', async () => {
			const wrapper = mountOptions();
			const button = buttonWith(wrapper, 'Manage model cache');

			expect(button.element.disabled).toBe(true);
			await button.trigger('click');

			expect(buttonWith(wrapper, 'Close')).toBeUndefined();
		});

		test('opens the manager when there is a model in the cache, and Close shuts it', async () => {
			model.downloadedSize = 1;
			const wrapper = mountOptions();
			const button = buttonWith(wrapper, 'Manage model cache');
			expect(button.element.disabled).toBe(false);

			await button.trigger('click');
			expect(wrapper.findComponent({ name: 'CacheManager' }).exists()).toBe(true);

			await buttonWith(wrapper, 'Close').trigger('click');
			expect(buttonWith(wrapper, 'Manage model cache')).toBeDefined();
		});
	});
});
