// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest';
import { defineComponent, reactive } from 'vue';
import { mount } from '@vue/test-utils';
import RadioField from '../../../../src/components/ui/RadioField.vue';

// two of a group, the way they are used; they are in the page, so the label can find its box, and they go with the test
const mounted = [];
afterEach(() => {
	mounted.splice(0).forEach((wrapper) => wrapper.unmount());
	document.body.innerHTML = '';
});
const hosted = (initial = 'CPU', gpuExtra = '') => {
	const state = reactive({ device: initial });
	const seen = [];
	const wrapper = mount(defineComponent({
		components: { RadioField },
		setup: () => ({ state, seen, record: (value) => seen.push({ value, inTheOwner: state.device }) }),
		template: `<div>
			<RadioField v-model="state.device" name="device" value="CPU" input-id="device-cpu" label="CPU" @change="record" />
			<RadioField v-model="state.device" name="device" value="GPU" input-id="device-gpu" label="GPU" testid="gpu-test" ${gpuExtra} @change="record" />
		</div>`,
	}), { attachTo: document.body });
	mounted.push(wrapper);
	return { wrapper, state, seen };
};
const radio = (wrapper, id) => wrapper.get('#' + id);

describe('RadioField', () => {
	test('is a round box with its text after it, that the label is for, in the group that it is told', () => {
		const { wrapper } = hosted();

		expect(radio(wrapper, 'device-gpu').attributes()).toMatchObject({ type: 'radio', name: 'device', value: 'GPU', 'data-testid': 'gpu-test' });
		expect(wrapper.get('label[for="device-gpu"]').text()).toBe('GPU');
		expect(radio(wrapper, 'device-gpu').classes()).toEqual(expect.arrayContaining(['choice', 'radio']));
	});

	test('the one whose value is the value of the group is the one that is checked', () => {
		const cpu = hosted('CPU').wrapper;
		expect([radio(cpu, 'device-cpu').element.checked, radio(cpu, 'device-gpu').element.checked]).toEqual([true, false]);

		const gpu = hosted('GPU').wrapper;
		expect([radio(gpu, 'device-cpu').element.checked, radio(gpu, 'device-gpu').element.checked]).toEqual([false, true]);
	});

	test('follows the group when the owner changes it', async () => {
		const { wrapper, state } = hosted('CPU');

		state.device = 'GPU';
		await wrapper.vm.$nextTick();

		expect([radio(wrapper, 'device-cpu').element.checked, radio(wrapper, 'device-gpu').element.checked]).toEqual([false, true]);
	});

	test('gives the owner its value when it is chosen, and the other one is not checked any more', async () => {
		const { wrapper, state } = hosted('CPU');

		await radio(wrapper, 'device-gpu').setValue(true);

		expect(state.device).toBe('GPU');
		expect([radio(wrapper, 'device-cpu').element.checked, radio(wrapper, 'device-gpu').element.checked]).toEqual([false, true]);
	});

	test('says change with its value, which the owner already has by then', async () => {
		const { wrapper, seen } = hosted('CPU');

		await radio(wrapper, 'device-gpu').setValue(true);
		await radio(wrapper, 'device-cpu').setValue(true);

		expect(seen).toEqual([{ value: 'GPU', inTheOwner: 'GPU' }, { value: 'CPU', inTheOwner: 'CPU' }]);
	});

	test('can be chosen again after the group was changed from outside', async () => {
		const { wrapper, state, seen } = hosted('CPU');
		state.device = 'GPU';
		await wrapper.vm.$nextTick();

		await radio(wrapper, 'device-cpu').setValue(true);

		expect(state.device).toBe('CPU');
		expect(seen).toHaveLength(1);
	});

	test('does not say change when the owner changes the group', async () => {
		const { wrapper, state, seen } = hosted('CPU');

		state.device = 'GPU';
		await wrapper.vm.$nextTick();

		expect(seen).toEqual([]);
	});

	test('is disabled with the attribute, and cannot be chosen then', async () => {
		const { wrapper, state, seen } = hosted('CPU', ':disabled="true"');
		const gpu = radio(wrapper, 'device-gpu');

		await gpu.trigger('click');

		expect(gpu.element.disabled).toBe(true);
		expect(gpu.attributes()).toHaveProperty('disabled');
		expect(state.device).toBe('CPU');
		expect(seen).toEqual([]);
	});

	test('the text can be clicked to choose it', async () => {
		const { wrapper, state } = hosted('CPU');

		await wrapper.get('label[for="device-gpu"]').trigger('click');

		expect(state.device).toBe('GPU');
	});

	test('says what it needs: a value, a name, a label and an id', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		mount(RadioField);

		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});
