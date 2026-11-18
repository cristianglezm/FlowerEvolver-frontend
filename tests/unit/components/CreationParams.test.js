// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import CreationParams from '../../../src/components/CreationParams.vue';
import { useSettingsStore } from '../../../src/stores/SettingsStore';

// The wasm is what draws the flowers, here it only has to be told the parameters.
const fe = vi.hoisted(() => ({ setParams: vi.fn() }));
vi.mock('../../../src/services/flowerEvolver', () => ({ getFlowerEvolver: async () => fe }));
vi.mock('@cristianglezm/flower-evolver-wasm', () => ({
	FEParams: class {
		constructor(radius, numLayers, P, bias){
			Object.assign(this, { radius, numLayers, P, bias });
		}
	},
}));

describe('CreationParams', () => {
	let SettingsStore;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: true, createSpy: vi.fn });
		SettingsStore = useSettingsStore();
		SettingsStore.settings.params = { radius: 64, numLayers: 3, P: 6.0, bias: 1.0 };
	});

	const mountParams = () => mount(CreationParams);
	const field = (wrapper, id) => wrapper.get(`#${id}`);
	const type = async (wrapper, id, text) => {
		const input = field(wrapper, id);
		input.element.value = text;
		await input.trigger('input');
	};
	const leave = async (wrapper, id) => {
		await field(wrapper, id).trigger('change');
		await flushPromises();
	};
	const edit = async (wrapper, id, text) => {
		await type(wrapper, id, text);
		await leave(wrapper, id);
	};
	const values = (wrapper) => ['params-radius', 'params-num-layers', 'params-p', 'params-bias'].map((id) => field(wrapper, id).element.value);

	test('has the four parameters, with their labels, and the values that are saved', () => {
		const wrapper = mountParams();

		expect(values(wrapper)).toEqual(['64', '3', '6', '1']);
		expect(wrapper.findAll('input[type=number]')).toHaveLength(4);
		expect(['params-radius', 'params-num-layers', 'params-p', 'params-bias']
			.map((id) => wrapper.get(`label[for="${id}"]`).text())).toEqual(['Radius:', 'Number of Layers:', 'P:', 'Bias:']);
	});

	test('the radius goes from 4 to 256 for the spinner', () => {
		expect(field(mountParams(), 'params-radius').attributes()).toMatchObject({ min: '4', max: '256' });
	});

	test('a value that is valid is saved, and the drawing is told', async () => {
		const wrapper = mountParams();

		await edit(wrapper, 'params-radius', '128');

		expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
		expect(SettingsStore.settings.params).toMatchObject({ radius: 128, numLayers: 3, P: 6, bias: 1 });
		expect(fe.setParams).toHaveBeenCalledTimes(1);
		expect(fe.setParams.mock.calls[0][0]).toMatchObject({ radius: 128, numLayers: 3, P: 6, bias: 1 });
	});

	test.each([
		['params-radius', '100', { radius: 100, numLayers: 3, P: 6, bias: 1 }],
		['params-num-layers', '2', { radius: 64, numLayers: 2, P: 6, bias: 1 }],
		['params-p', '3.5', { radius: 64, numLayers: 3, P: 3.5, bias: 1 }],
		['params-bias', '0.5', { radius: 64, numLayers: 3, P: 6, bias: 0.5 }],
	])('leaving %s saves it, once, and tells the drawing, without any other field being left', async (id, text, expected) => {
		const wrapper = mountParams();

		await edit(wrapper, id, text);

		expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
		expect(SettingsStore.settings.params).toMatchObject(expected);
		expect(fe.setParams).toHaveBeenCalledTimes(1);
		expect(fe.setParams.mock.calls[0][0]).toMatchObject(expected);
	});

	test('nothing is saved while a value is typed, only when the field is left', async () => {
		const wrapper = mountParams();

		await type(wrapper, 'params-radius', '12');
		await type(wrapper, 'params-radius', '128');

		expect(SettingsStore.saveSettings).not.toHaveBeenCalled();
		expect(fe.setParams).not.toHaveBeenCalled();
	});

	test('a radius outside of 4 to 256 is brought into it, and what is shown is the one that is kept', async () => {
		const wrapper = mountParams();

		await edit(wrapper, 'params-radius', '900');
		expect(field(wrapper, 'params-radius').element.value).toBe('256');
		expect(SettingsStore.settings.params.radius).toBe(256);

		await edit(wrapper, 'params-radius', '1');
		expect(field(wrapper, 'params-radius').element.value).toBe('4');
		expect(SettingsStore.settings.params.radius).toBe(4);
	});

	test('the layers go from 1 to as many as the radius can be halved, and are brought into it when the radius is left', async () => {
		const wrapper = mountParams();

		// a radius of 4 can be halved 2 times
		await edit(wrapper, 'params-radius', '4');

		expect(SettingsStore.settings.params).toMatchObject({ radius: 4, numLayers: 2 });
		expect(field(wrapper, 'params-num-layers').element.value).toBe('2');
	});

	test('the layers are at least 1', async () => {
		const wrapper = mountParams();

		await edit(wrapper, 'params-num-layers', '-3');

		expect(SettingsStore.settings.params.numLayers).toBe(1);
		expect(field(wrapper, 'params-num-layers').element.value).toBe('1');
	});

	test('P and bias go back to their default when they are left empty, and any number is kept', async () => {
		const wrapper = mountParams();

		await edit(wrapper, 'params-p', '');
		await edit(wrapper, 'params-bias', '');
		expect(SettingsStore.settings.params).toMatchObject({ P: 6, bias: 1 });
		expect(field(wrapper, 'params-p').element.value).toBe('6');
		expect(field(wrapper, 'params-bias').element.value).toBe('1');

		await edit(wrapper, 'params-p', '3.5');
		await edit(wrapper, 'params-bias', '-0.25');
		expect(SettingsStore.settings.params).toMatchObject({ P: 3.5, bias: -0.25 });
	});

	test('Restore defaults puts them back, shows them, saves them, and tells the drawing', async () => {
		SettingsStore.settings.params = { radius: 200, numLayers: 5, P: 2, bias: 0.5 };
		const wrapper = mountParams();

		await wrapper.get('button.safe-button').trigger('click');
		await flushPromises();

		expect(values(wrapper)).toEqual(['64', '3', '6', '1']);
		expect(SettingsStore.settings.params).toMatchObject({ radius: 64, numLayers: 3, P: 6, bias: 1 });
		expect(SettingsStore.saveSettings).toHaveBeenCalledTimes(1);
		expect(fe.setParams.mock.calls[0][0]).toMatchObject({ radius: 64, numLayers: 3, P: 6, bias: 1 });
	});
});
