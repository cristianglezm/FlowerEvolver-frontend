// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import CreationParams from '../../../src/components/CreationParams.vue';
import { useSettingsStore } from '../../../src/stores/SettingsStore';
import { useErrorStore } from '../../../src/stores/ErrorStore';
import { getFlowerEvolver } from '../../../src/services/flowerEvolver';

// The wasm is the real one: it is what limits the params, and the component asks it what it kept.
describe('CreationParams', () => {
	const DEFAULTS = { radius: 64, numLayers: 3, P: 6, bias: 1 };
	let SettingsStore;
	let ErrorStore;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: true, createSpy: vi.fn });
		SettingsStore = useSettingsStore();
		ErrorStore = useErrorStore();
		SettingsStore.settings.params = { ...DEFAULTS };
	});

	const mountParams = () => mount(CreationParams);
	const field = (wrapper, id) => wrapper.get(`#${id}`);
	const type = async (wrapper, id, text) => {
		const input = field(wrapper, id);
		input.element.value = text;
		await input.trigger('input');
	};
	// the params are saved when a field is left, once the wasm has said what it kept
	const saved = (times) => vi.waitFor(() => expect(SettingsStore.setCreationParams).toHaveBeenCalledTimes(times));
	const edit = async (wrapper, id, text) => {
		const before = SettingsStore.setCreationParams.mock.calls.length;
		await type(wrapper, id, text);
		await field(wrapper, id).trigger('change');
		await saved(before + 1);
	};
	const lastSaved = () => SettingsStore.setCreationParams.mock.calls.at(-1)[0];
	const values = (wrapper) => ['params-radius', 'params-num-layers', 'params-p', 'params-bias'].map((id) => field(wrapper, id).element.value);

	test('has the four parameters, with their labels, and the values that are saved', () => {
		const wrapper = mountParams();

		expect(values(wrapper)).toEqual(['64', '3', '6', '1']);
		expect(wrapper.findAll('input[type=number]')).toHaveLength(4);
		expect(['params-radius', 'params-num-layers', 'params-p', 'params-bias']
			.map((id) => wrapper.get(`label[for="${id}"]`).text())).toEqual(['Radius:', 'Number of Layers:', 'P:', 'Bias:']);
	});

	test('has the fields that the composable describes, with their tooltips', () => {
		const wrapper = mountParams();

		const tips = wrapper.findAllComponents({ name: 'ToolTip' }).map((tip) => tip.props('info'));

		expect(tips).toHaveLength(4);
		expect(tips[0]).toBe('radius of the flower, min: 4 and max: 256, for bigger radius use the desktop app.');
		expect(tips[3]).toBe('bias for the flower');
	});

	test('the radius goes from 4 to 256 for the spinner', () => {
		expect(field(mountParams(), 'params-radius').attributes()).toMatchObject({ min: '4', max: '256' });
	});

	test('the layers go from 1 for the spinner, and the other two have no bounds', () => {
		const wrapper = mountParams();

		expect(field(wrapper, 'params-num-layers').attributes()).toMatchObject({ min: '1' });
		expect(field(wrapper, 'params-num-layers').attributes('max')).toBeUndefined();
		expect(field(wrapper, 'params-p').attributes('min')).toBeUndefined();
		expect(field(wrapper, 'params-bias').attributes('max')).toBeUndefined();
	});

	test('starts with the params of the settings', () => {
		SettingsStore.settings.params = { radius: 100, numLayers: 5, P: 2.5, bias: -1 };

		expect(values(mountParams())).toEqual(['100', '5', '2.5', '-1']);
	});

	test('a value that is valid is saved, as the settings keep it', async () => {
		const wrapper = mountParams();

		await edit(wrapper, 'params-radius', '128');

		expect(SettingsStore.setCreationParams).toHaveBeenCalledExactlyOnceWith({ radius: 128, numLayers: 3, P: 6, bias: 1 });
	});

	test.each([
		['params-radius', '100', { radius: 100, numLayers: 3, P: 6, bias: 1 }],
		['params-num-layers', '2', { radius: 64, numLayers: 2, P: 6, bias: 1 }],
		['params-p', '3.5', { radius: 64, numLayers: 3, P: 3.5, bias: 1 }],
		['params-bias', '0.5', { radius: 64, numLayers: 3, P: 6, bias: 0.5 }],
	])('leaving %s saves it, once, with the other fields as they were', async (id, text, expected) => {
		const wrapper = mountParams();

		await edit(wrapper, id, text);

		expect(SettingsStore.setCreationParams).toHaveBeenCalledExactlyOnceWith(expected);
	});

	test('nothing is saved while a value is typed, only when the field is left', async () => {
		const wrapper = mountParams();

		await type(wrapper, 'params-radius', '12');
		await type(wrapper, 'params-radius', '128');
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(SettingsStore.setCreationParams).not.toHaveBeenCalled();
	});

	test('a radius outside of 4 to 256 is brought into it by the wasm, and what is shown and saved is the one that it kept', async () => {
		const wrapper = mountParams();

		await edit(wrapper, 'params-radius', '900');
		await vi.waitFor(() => expect(field(wrapper, 'params-radius').element.value).toBe('256'));
		expect(lastSaved().radius).toBe(256);

		await edit(wrapper, 'params-radius', '1');
		await vi.waitFor(() => expect(field(wrapper, 'params-radius').element.value).toBe('4'));
		expect(lastSaved().radius).toBe(4);
	});

	test('the layers are brought into the limit of the radius when it is left, as the wasm says', async () => {
		const wrapper = mountParams();

		// a radius of 4 can be halved 2 times
		await edit(wrapper, 'params-radius', '4');

		await vi.waitFor(() => expect(field(wrapper, 'params-num-layers').element.value).toBe('2'));
		expect(lastSaved()).toMatchObject({ radius: 4, numLayers: 2 });
	});

	test('the layers are at least 1', async () => {
		const wrapper = mountParams();

		await edit(wrapper, 'params-num-layers', '-3');

		await vi.waitFor(() => expect(field(wrapper, 'params-num-layers').element.value).toBe('1'));
		expect(lastSaved().numLayers).toBe(1);
	});

	test('the limit of the layers is the one of the wasm, not a rule that the component has: 6 at a radius of 100, and 7 is 6', async () => {
		const wrapper = mountParams();
		await edit(wrapper, 'params-radius', '100');

		await edit(wrapper, 'params-num-layers', '6');
		expect(lastSaved()).toMatchObject({ radius: 100, numLayers: 6 });

		await edit(wrapper, 'params-num-layers', '7');
		await vi.waitFor(() => expect(field(wrapper, 'params-num-layers').element.value).toBe('6'));
		expect(lastSaved().numLayers).toBe(6);
	});

	test('P and bias go back to their default when they are left empty, and any number is kept', async () => {
		const wrapper = mountParams();

		await edit(wrapper, 'params-p', '');
		await edit(wrapper, 'params-bias', '');
		expect(lastSaved()).toMatchObject({ P: 6, bias: 1 });
		expect(field(wrapper, 'params-p').element.value).toBe('6');
		expect(field(wrapper, 'params-bias').element.value).toBe('1');

		await edit(wrapper, 'params-p', '3.5');
		await edit(wrapper, 'params-bias', '-0.25');
		expect(lastSaved()).toMatchObject({ P: 3.5, bias: -0.25 });
	});

	test('the radius and the layers go back to their default when they are left empty too', async () => {
		SettingsStore.settings.params = { radius: 128, numLayers: 5, P: 2, bias: 0.5 };
		const wrapper = mountParams();

		await edit(wrapper, 'params-radius', '');
		await edit(wrapper, 'params-num-layers', '');

		expect(lastSaved()).toMatchObject({ radius: 64, numLayers: 3 });
	});

	test('Restore defaults puts them back, shows them, and saves them', async () => {
		SettingsStore.settings.params = { radius: 200, numLayers: 5, P: 2, bias: 0.5 };
		const wrapper = mountParams();

		await wrapper.get('button.safe-button').trigger('click');
		await saved(1);

		expect(values(wrapper)).toEqual(['64', '3', '6', '1']);
		expect(SettingsStore.setCreationParams).toHaveBeenCalledExactlyOnceWith(DEFAULTS);
	});

	test('does not write the settings itself: it asks the store, which copies them and saves them', async () => {
		const wrapper = mountParams();
		const before = SettingsStore.settings.params;

		await edit(wrapper, 'params-radius', '128');

		expect(SettingsStore.settings.params).toBe(before);
		expect(SettingsStore.saveSettings).not.toHaveBeenCalled();
	});

	test('leaves the evolver with the params that it had: it is asked, and not told', async () => {
		const fe = await getFlowerEvolver();
		fe.setParams(new FEParams(32, 2, 4, 0.5));
		const had = fe.getParams();
		const wrapper = mountParams();

		await edit(wrapper, 'params-radius', '512');

		expect(fe.getParams()).toBe(had);
	});

	test('says that it could not check the params, and saves nothing, when the wasm fails', async () => {
		const fe = await getFlowerEvolver();
		const makePetals = fe.makePetals;
		fe.makePetals = async () => { throw new Error('wasm'); };
		const wrapper = mountParams();

		try{
			await type(wrapper, 'params-radius', '128');
			await field(wrapper, 'params-radius').trigger('change');
			await vi.waitFor(() => expect(ErrorStore.push).toHaveBeenCalledExactlyOnceWith("couldn't check the params with the wasm."));
		}finally{
			fe.makePetals = makePetals;
		}

		expect(SettingsStore.setCreationParams).not.toHaveBeenCalled();
		expect(field(wrapper, 'params-radius').element.value).toBe('128');
	});

	test('can be saved again after the wasm failed', async () => {
		const fe = await getFlowerEvolver();
		const makePetals = fe.makePetals;
		fe.makePetals = async () => { throw new Error('wasm'); };
		const wrapper = mountParams();
		await type(wrapper, 'params-radius', '128');
		await field(wrapper, 'params-radius').trigger('change');
		await vi.waitFor(() => expect(ErrorStore.push).toHaveBeenCalledTimes(1));
		fe.makePetals = makePetals;

		await edit(wrapper, 'params-radius', '100');

		expect(lastSaved()).toMatchObject({ radius: 100 });
	});
});
