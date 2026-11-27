// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import mitt from 'mitt';
import { createTestingPinia } from '@pinia/testing';
import AppOptions from '../../../src/components/AppOptions.vue';
import { useSettingsStore } from '../../../src/stores/SettingsStore';

describe('AppOptions, the limit and the magnification', () => {
	let SettingsStore;
	let emitter;

	beforeEach(() => {
		createTestingPinia({ stubActions: true, createSpy: vi.fn });
		SettingsStore = useSettingsStore();
		SettingsStore.settings.limit = 100;
		SettingsStore.settings.magnification = 4;
		emitter = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
		Object.defineProperty(navigator, 'storage', {
			configurable: true,
			value: { persist: async () => true, persisted: async () => false, estimate: async () => ({ usage: 0, quota: 0 }) },
		});
	});

	afterEach(() => {
		delete navigator.storage;
	});

	const mountOptions = async () => {
		const wrapper = mount(AppOptions, { global: { provide: { emitter } } });
		await flushPromises();
		// it saves when it is shown, which is not what these tests look at
		SettingsStore.saveSettings.mockClear();
		return wrapper;
	};
	const type = async (wrapper, selector, text) => {
		const input = wrapper.get(selector);
		input.element.value = text;
		await input.trigger('input');
	};
	const leave = async (wrapper, selector) => {
		await wrapper.get(selector).trigger('change');
	};

	describe('the limit', () => {
		test('is a number field with its label, and the value that is saved', async () => {
			SettingsStore.settings.limit = 25;
			const wrapper = await mountOptions();

			const input = wrapper.get('#setLimit');
			expect(input.element.value).toBe('25');
			expect(input.attributes()).toMatchObject({ type: 'number', min: '1' });
			expect(wrapper.get('label[for="setLimit"]').text()).toBe('Limit per Page:');
			expect(wrapper.get('#limit-settings').classes()).toContain('option-box');
		});

		test('a number is saved when the field is left, and not while it is typed', async () => {
			const wrapper = await mountOptions();

			await type(wrapper, '#setLimit', '30');
			expect(SettingsStore.saveSettings).not.toHaveBeenCalled();
			await leave(wrapper, '#setLimit');

			expect(SettingsStore.settings.limit).toBe(30);
			expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
		});

		test('an empty field goes back to 100, and is shown and saved as that', async () => {
			SettingsStore.settings.limit = 25;
			const wrapper = await mountOptions();

			await type(wrapper, '#setLimit', '');
			await leave(wrapper, '#setLimit');

			expect(SettingsStore.settings.limit).toBe(100);
			expect(wrapper.get('#setLimit').element.value).toBe('100');
			expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
		});
	});

	describe('the magnification', () => {
		test('is a slider from 4 to 16 in steps of 2 with its label, at the value that is saved, and says it with an x', async () => {
			SettingsStore.settings.magnification = 8;
			const wrapper = await mountOptions();

			const input = wrapper.get('#magnification-range');
			expect(input.attributes()).toMatchObject({ type: 'range', min: '4', max: '16', step: '2' });
			expect(input.element.value).toBe('8');
			expect(wrapper.get('label[for="magnification-range"]').text()).toBe('Magnification:');
			expect(wrapper.get('#magnification-option .range-value').text()).toBe('8x');
			expect(wrapper.get('#magnification-option').classes()).toContain('option-box');
		});

		test('moving it changes the value that is shown, and it is saved when it is let go', async () => {
			const wrapper = await mountOptions();

			await type(wrapper, '#magnification-range', '12');
			expect(wrapper.get('#magnification-option .range-value').text()).toBe('12x');
			expect(SettingsStore.settings.magnification).toBe(12);
			expect(SettingsStore.saveSettings).not.toHaveBeenCalled();

			await leave(wrapper, '#magnification-range');
			expect(SettingsStore.settings.magnification).toBe(12);
			expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
		});

		test('a magnification that was saved outside of 4 to 16 is brought into it when it is let go', async () => {
			SettingsStore.settings.magnification = 40;
			const wrapper = await mountOptions();

			await leave(wrapper, '#magnification-range');

			expect(SettingsStore.settings.magnification).toBe(16);
			expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
		});
	});

	describe('the options that are on or off', () => {
		const ROWS = [
			['pagination', 'pagination-option', 'Pagination:', 'pagination'],
			['loadDemoFlowers', 'loadDemoFlowers-option', 'Load Demo Flowers:', 'loadDemoFlowers'],
			['loadCaptionerModel', 'loadCaptionerModel-option', 'Load Captioner:', 'loadCaptionerModel'],
			['loadChatBotModel', 'loadModelChatBot-option', 'Load ChatBot:', 'loadChatBotModel'],
			['loadKokoroModel', 'loadModelKokoro-option', 'Load Kokoro:', 'loadKokoroModel'],
		];

		test.each(ROWS)('%s is a box with its label and tooltip, and the id that the specs look for', async (inputId, rowId, label) => {
			const wrapper = await mountOptions();
			const input = wrapper.get('#' + inputId);

			expect(input.attributes('type')).toBe('checkbox');
			expect(input.classes()).toContain('choice');
			expect(wrapper.get(`label[for="${inputId}"]`).text()).toBe(label);
			expect(wrapper.get('#' + rowId).classes()).toContain('option-box');
			expect(wrapper.get('#' + rowId).findComponent({ name: 'ToolTip' }).exists()).toBe(true);
		});

		test.each(ROWS)('%s is checked when the setting is on, and not when it is off', async (inputId, _, __, setting) => {
			SettingsStore.settings[setting] = true;
			expect((await mountOptions()).get('#' + inputId).element.checked).toBe(true);

			SettingsStore.settings[setting] = false;
			expect((await mountOptions()).get('#' + inputId).element.checked).toBe(false);
		});

		test.each(ROWS)('%s changes the setting and saves it, once, with the new value already in the settings', async (inputId, _, __, setting) => {
			SettingsStore.settings[setting] = false;
			const wrapper = await mountOptions();
			const saved = [];
			SettingsStore.saveSettings.mockImplementation(() => saved.push(SettingsStore.settings[setting]));

			await wrapper.get('#' + inputId).setValue(true);

			expect(SettingsStore.settings[setting]).toBe(true);
			expect(saved).toEqual([true]);
		});

		test.each([
			['loadCaptionerModel', 'App#loadCaptionerModel'],
			['loadChatBotModel', 'ChatBotWidget#loadChatBotModel'],
			['loadKokoroModel', 'ChatBotWidget#loadKokoroModel'],
		])('%s loads the model when it is checked, and does not when it is unchecked', async (inputId, event) => {
			SettingsStore.settings[inputId] = false;
			const wrapper = await mountOptions();

			await wrapper.get('#' + inputId).setValue(true);
			expect(emitter.emit).toHaveBeenCalledExactlyOnceWith(event);

			emitter.emit.mockClear();
			await wrapper.get('#' + inputId).setValue(false);
			expect(emitter.emit).not.toHaveBeenCalled();
		});

		test('pagination and the demo flowers do not load a model', async () => {
			const wrapper = await mountOptions();

			await wrapper.get('#pagination').setValue(true);
			await wrapper.get('#loadDemoFlowers').setValue(true);

			expect(emitter.emit).not.toHaveBeenCalled();
		});

		test('persistent storage asks the browser for it and is checked when it is given', async () => {
			const persist = vi.fn(async () => true);
			navigator.storage.persist = persist;
			const wrapper = await mountOptions();
			expect(wrapper.get('#persist').element.checked).toBe(false);

			await wrapper.get('#persist').setValue(true);
			await flushPromises();

			expect(persist).toHaveBeenCalledTimes(1);
			expect(wrapper.get('#persist').element.checked).toBe(true);
			expect(wrapper.get('label[for="persist"]').text()).toBe('Persistent storage:');
			expect(SettingsStore.saveSettings).not.toHaveBeenCalled();
		});

		test('persistent storage is not checked when the browser says no', async () => {
			navigator.storage.persist = vi.fn(async () => false);
			const wrapper = await mountOptions();

			await wrapper.get('#persist').setValue(true);
			await flushPromises();

			expect(wrapper.get('#persist').element.checked).toBe(false);
		});
	});

	describe('a browser that cannot keep the storage (a page that is not secure, an old one)', () => {
		const without = (storage) => {
			if(storage === undefined){
				delete navigator.storage;
			}else{
				Object.defineProperty(navigator, 'storage', { configurable: true, value: storage });
			}
		};
		// what nothing handled is a failure of the application, and the framework only says it as a warning
		const watched = () => {
			const rejected = [];
			const onRejected = (reason) => rejected.push(reason);
			process.on('unhandledRejection', onRejected);
			return { rejected, stop: () => process.off('unhandledRejection', onRejected) };
		};

		test.each([
			['has no storage at all', undefined],
			['has a storage that cannot say whether it is kept', { estimate: async () => ({ usage: 0, quota: 0 }) }],
		])('is shown, with persistent storage not checked, and nothing fails, when the browser %s', async (_, storage) => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const watch = watched();
			without(storage);

			const wrapper = await mountOptions();
			await new Promise((resolve) => setTimeout(resolve, 20));

			expect(wrapper.get('#persist').element.checked).toBe(false);
			expect(watch.rejected).toEqual([]);
			expect(warn).not.toHaveBeenCalled();
			watch.stop();
			warn.mockRestore();
		});

		test.each([
			['has no storage at all', undefined],
			['has a storage that cannot keep it', { persisted: async () => false, estimate: async () => ({ usage: 0, quota: 0 }) }],
		])('does not stay checked when it is asked to keep the storage and the browser %s: nothing was given', async (_, storage) => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const watch = watched();
			without(storage);
			const wrapper = await mountOptions();

			await wrapper.get('#persist').setValue(true);
			await flushPromises();
			await new Promise((resolve) => setTimeout(resolve, 20));

			expect(wrapper.get('#persist').element.checked).toBe(false);
			expect(watch.rejected).toEqual([]);
			expect(warn).not.toHaveBeenCalled();
			watch.stop();
			warn.mockRestore();
		});
	});

	test('leaves the listeners of others on its event when it is unmounted', async () => {
		const real = mitt();
		const other = vi.fn();
		real.on('AppOptions#recalcSpace', other);
		const wrapper = mount(AppOptions, { global: { provide: { emitter: real } } });
		await flushPromises();
		expect(real.all.get('AppOptions#recalcSpace')).toHaveLength(2);

		wrapper.unmount();
		real.emit('AppOptions#recalcSpace');

		expect(real.all.get('AppOptions#recalcSpace')).toEqual([other]);
		expect(other).toHaveBeenCalledTimes(1);
	});
});
