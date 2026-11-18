// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import MutationRates from '../../../src/components/MutationRates.vue';
import { useSettingsStore } from '../../../src/stores/SettingsStore';

const RATES = ['addNodeRate', 'addConnRate', 'removeConnRate', 'perturbWeightsRate', 'enableRate', 'disableRate', 'actTypeRate'];
const DEFAULTS = { addNodeRate: 0.2, addConnRate: 0.3, removeConnRate: 0.2, perturbWeightsRate: 0.6, enableRate: 0.35, disableRate: 0.3, actTypeRate: 0.4 };

describe('MutationRates', () => {
	let SettingsStore;

	beforeEach(() => {
		createTestingPinia({ stubActions: true, createSpy: vi.fn });
		SettingsStore = useSettingsStore();
		SettingsStore.settings.mutationRates = { ...DEFAULTS };
	});

	const mountRates = () => mount(MutationRates);
	const slider = (wrapper, name) => wrapper.get(`#mutation-${name}`);
	const move = async (wrapper, name, value) => {
		const input = slider(wrapper, name);
		input.element.value = String(value);
		await input.trigger('input');
	};
	const letGo = async (wrapper, name) => {
		await slider(wrapper, name).trigger('change');
	};
	const shown = (wrapper, name) => slider(wrapper, name).element.closest('.field-row').querySelector('.range-value').textContent;

	test('has a slider for each rate, with its label, from 0 to 100 percent', () => {
		const wrapper = mountRates();

		expect(wrapper.findAll('input[type=range]')).toHaveLength(7);
		for(const name of RATES){
			const input = slider(wrapper, name);
			expect(input.attributes()).toMatchObject({ min: '0', max: '100', step: '1' });
			expect(wrapper.find(`label[for="mutation-${name}"]`).exists()).toBe(true);
		}
		expect(RATES.map((name) => wrapper.get(`label[for="mutation-${name}"]`).text())).toEqual([
			'Add Node Rate:', 'Add Connection Rate:', 'Remove Connection Rate:', 'Perturb Weights Rate:',
			'Enable Rate:', 'Disable Rate:', 'Activation Type Rate:',
		]);
	});

	test('every rate has a tooltip', () => {
		expect(mountRates().findAll('.tipInfo')).toHaveLength(7);
	});

	test('shows each rate as a percentage, the slider at it', () => {
		const wrapper = mountRates();

		expect(RATES.map((name) => shown(wrapper, name))).toEqual(['20%', '30%', '20%', '60%', '35%', '30%', '40%']);
		expect(slider(wrapper, 'enableRate').element.value).toBe('35');
	});

	test('shows the rates that are saved', () => {
		SettingsStore.settings.mutationRates = { ...DEFAULTS, addNodeRate: 0.07, enableRate: 1 };

		const wrapper = mountRates();

		expect(shown(wrapper, 'addNodeRate')).toBe('7%');
		expect(shown(wrapper, 'enableRate')).toBe('100%');
	});

	test('moving a slider changes what is shown, and nothing is saved until it is let go', async () => {
		const wrapper = mountRates();

		await move(wrapper, 'addNodeRate', 55);

		expect(shown(wrapper, 'addNodeRate')).toBe('55%');
		expect(SettingsStore.saveSettings).not.toHaveBeenCalled();
		expect(SettingsStore.settings.mutationRates.addNodeRate).toBe(0.2);
	});

	test('a slider that is let go saves the rate as a number from 0 to 1, and the others as they were', async () => {
		const wrapper = mountRates();

		await move(wrapper, 'perturbWeightsRate', 70);
		await letGo(wrapper, 'perturbWeightsRate');

		expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
		expect(SettingsStore.settings.mutationRates).toEqual({ ...DEFAULTS, perturbWeightsRate: 0.7 });
	});

	test('each rate is its own: the one that is moved is saved, and the others keep their value', async () => {
		const moved = { addNodeRate: 5, addConnRate: 29, removeConnRate: 100, perturbWeightsRate: 0, enableRate: 71, disableRate: 13, actTypeRate: 99 };

		for(const name of RATES){
			SettingsStore.settings.mutationRates = { ...DEFAULTS };
			SettingsStore.saveSettings.mockClear();
			const wrapper = mountRates();

			await move(wrapper, name, moved[name]);
			await letGo(wrapper, name);

			expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
			expect(SettingsStore.settings.mutationRates).toEqual({ ...DEFAULTS, [name]: moved[name] / 100 });
			wrapper.unmount();
		}
	});

	test('a rate that was saved outside of 0 to 1 is brought into it when a slider is let go, every one of them', async () => {
		SettingsStore.settings.mutationRates = {
			addNodeRate: 1.5, addConnRate: -0.1, removeConnRate: 2, perturbWeightsRate: -3, enableRate: 1.01, disableRate: -0.2, actTypeRate: 9,
		};
		const wrapper = mountRates();

		await letGo(wrapper, 'addConnRate');

		expect(SettingsStore.settings.mutationRates).toEqual({
			addNodeRate: 1, addConnRate: 0, removeConnRate: 1, perturbWeightsRate: 0, enableRate: 1, disableRate: 0, actTypeRate: 1,
		});
	});

	test('Restore defaults puts the rates back, shows them, and saves them', async () => {
		const wrapper = mountRates();
		await move(wrapper, 'addNodeRate', 90);
		await letGo(wrapper, 'addNodeRate');
		SettingsStore.saveSettings.mockClear();

		await wrapper.get('button.safe-button').trigger('click');

		expect(SettingsStore.settings.mutationRates).toEqual(DEFAULTS);
		expect(shown(wrapper, 'addNodeRate')).toBe('20%');
		expect(RATES.map((name) => slider(wrapper, name).element.value)).toEqual(['20', '30', '20', '60', '35', '30', '40']);
		expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
	});
});
