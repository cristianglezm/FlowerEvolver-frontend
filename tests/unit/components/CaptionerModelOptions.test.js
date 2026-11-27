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
const gpu = vi.hoisted(() => ({ available: false }));
vi.mock('../../../src/stores/CaptionerStore/Captioner', () => ({
	Captioner: { modelOptions: { model: 'Xenova/vit-gpt2-image-captioning' } },
	isGPUAvailable: () => gpu.available,
	CACHE_KEY: 'captioner-cache',
}));
vi.mock('../../../src/services/CacheManager', () => ({
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
		gpu.available = false;
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

	describe('when it is unmounted', () => {
		test('it leaves the listeners of others on the events that it listened to', () => {
			// the options of the chat and of the voice listen to the same ones, on the same emitter
			const others = ['modelOptions#forceReload', 'CaptionerModelOptions#updateBtnTitle'].map((event) => {
				const other = vi.fn();
				emitter.on(event, other);
				return [event, other];
			});
			const wrapper = mountOptions();

			wrapper.unmount();
			for(const [event, other] of others){
				expect(emitter.all.get(event), event).toEqual([other]);
				emitter.emit(event);
				expect(other, event).toHaveBeenCalledTimes(1);
			}
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

	describe('the device', () => {
		const cpu = (wrapper) => wrapper.get('#captioner-device-cpu');
		// the options are saved when the component is shown, which is not what these tests look at
		const mountDevice = () => {
			const wrapper = mountOptions();
			captionerStore.saveModelOptions.mockClear();
			return wrapper;
		};
		const gpuBox = (wrapper) => wrapper.get('#captioner-device-gpu');

		test('is a pair of round boxes with the text after them, in a group, CPU checked when the options say so', () => {
			const wrapper = mountDevice();

			expect(cpu(wrapper).attributes()).toMatchObject({ type: 'radio', name: 'captioner-device', value: 'CPU' });
			expect(gpuBox(wrapper).attributes()).toMatchObject({ type: 'radio', name: 'captioner-device', value: 'GPU' });
			expect(wrapper.get('label[for="captioner-device-cpu"]').text()).toBe('CPU');
			expect(wrapper.get('label[for="captioner-device-gpu"]').text()).toBe('GPU');
			expect([cpu(wrapper).element.checked, gpuBox(wrapper).element.checked]).toEqual([true, false]);
		});

		test('has GPU checked when the options say so', () => {
			captionerStore.modelOptions.device = 'GPU';

			const wrapper = mountDevice();

			expect([cpu(wrapper).element.checked, gpuBox(wrapper).element.checked]).toEqual([false, true]);
		});

		test('cannot choose GPU when the browser has none, with the attribute', async () => {
			const wrapper = mountDevice();

			expect(gpuBox(wrapper).element.disabled).toBe(true);
			expect(gpuBox(wrapper).attributes()).toHaveProperty('disabled');
			await gpuBox(wrapper).trigger('click');
			expect(captionerStore.modelOptions.device).toBe('CPU');
			expect(cpu(wrapper).element.disabled).toBe(false);
		});

		test('can choose GPU when the browser has one, and the options are saved with it', async () => {
			gpu.available = true;
			const wrapper = mountDevice();

			await gpuBox(wrapper).setValue(true);

			expect(gpuBox(wrapper).element.disabled).toBe(false);
			expect(captionerStore.modelOptions.device).toBe('GPU');
			expect(captionerStore.saveModelOptions).toHaveBeenCalledTimes(1);
			expect([cpu(wrapper).element.checked, gpuBox(wrapper).element.checked]).toEqual([false, true]);
		});

		test('can go back to CPU, and the options are saved again', async () => {
			gpu.available = true;
			captionerStore.modelOptions.device = 'GPU';
			const wrapper = mountDevice();

			await cpu(wrapper).setValue(true);

			expect(captionerStore.modelOptions.device).toBe('CPU');
			expect(captionerStore.saveModelOptions).toHaveBeenCalledTimes(1);
		});

		test('a device that is chosen has the model loaded again, the button says so', async () => {
			gpu.available = true;
			captionerStore.hasModelLoaded = true;
			// the store works out that the options are not the ones of the model that is loaded when it saves them
			captionerStore.saveModelOptions = vi.fn(() => { captionerStore.hasModelOptionsChanged = true; });
			const wrapper = mountDevice();
			// the button is retitled when the options change, so it is the one that has `model` in its text
			const button = () => wrapper.findAll('button').find((candidate) => /model/i.test(candidate.text()));
			expect(button().element.disabled).toBe(true);

			await gpuBox(wrapper).setValue(true);

			expect(button().element.disabled).toBe(false);
		});
	});
});
