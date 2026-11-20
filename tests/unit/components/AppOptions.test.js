// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
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
});
