// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NumberField from '../../../../src/components/ui/NumberField.vue';

describe('NumberField', () => {
	// a parent that keeps the value, as `v-model` does
	const mountField = (props = {}, modelValue = 5) => {
		const wrapper = mount(NumberField, {
			props: {
				label: 'Radius: ', inputId: 'params-radius', modelValue,
				'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
				...props,
			},
		});
		return wrapper;
	};
	// what is typed, and nothing else: setValue of the test utils also says that the field was left
	const type = async (wrapper, text) => {
		const input = wrapper.get('input');
		input.element.value = text;
		await input.trigger('input');
	};
	const leave = async (wrapper) => {
		await wrapper.get('input').trigger('change');
	};

	describe('what it is', () => {
		test('is a number input with the id that its label is for, and the value that it is given', () => {
			const wrapper = mountField({ tooltip: 'the radius' }, 12);
			const input = wrapper.get('input');

			expect(input.attributes('type')).toBe('number');
			expect(input.attributes('id')).toBe('params-radius');
			expect(wrapper.get('label').attributes('for')).toBe('params-radius');
			expect(wrapper.get('label').text()).toBe('Radius:');
			expect(input.element.value).toBe('12');
			expect(wrapper.find('.tipInfo').exists()).toBe(true);
		});

		test('has the min, the max and the step for the input, and the test id', () => {
			const input = mountField({ min: 4, max: 256, step: 2, testid: 'finetune-epochs' }).get('input');

			expect(input.attributes()).toMatchObject({ min: '4', max: '256', step: '2', 'data-testid': 'finetune-epochs' });
		});

		test('has none of them when they are not given', () => {
			const attributes = mountField().get('input').attributes();

			expect(attributes).not.toHaveProperty('min');
			expect(attributes).not.toHaveProperty('max');
			expect(attributes).not.toHaveProperty('step');
			expect(attributes).not.toHaveProperty('data-testid');
			expect(attributes).not.toHaveProperty('disabled');
		});

		test('can be disabled', () => {
			expect(mountField({ disabled: true }).get('input').attributes()).toHaveProperty('disabled');
		});

		test('is one element, that takes the id and the class that it is given', () => {
			const wrapper = mount(NumberField, {
				props: { label: 'Limit: ', inputId: 'setLimit', modelValue: 1 },
				attrs: { id: 'limit-settings', class: 'option-box' },
			});

			expect(wrapper.element.id).toBe('limit-settings');
			expect(wrapper.classes()).toContain('option-box');
		});
	});

	describe('v-model', () => {
		test('follows what is typed, as a number', async () => {
			const wrapper = mountField();

			await type(wrapper, '64');
			expect(wrapper.props('modelValue')).toBe(64);

			await type(wrapper, '0.35');
			expect(wrapper.props('modelValue')).toBe(0.35);

			await type(wrapper, '-3');
			expect(wrapper.props('modelValue')).toBe(-3);
		});

		test('is an empty string when the field is emptied', async () => {
			const wrapper = mountField();

			await type(wrapper, '');

			expect(wrapper.props('modelValue')).toBe('');
		});

		test('shows the value when the parent changes it', async () => {
			const wrapper = mountField();

			await wrapper.setProps({ modelValue: 99 });

			expect(wrapper.get('input').element.value).toBe('99');
		});

		test('does not say that it changed when it is only left', async () => {
			const onUpdate = vi.fn();
			const wrapper = mountField({ 'onUpdate:modelValue': onUpdate });

			await leave(wrapper);

			expect(onUpdate).not.toHaveBeenCalled();
		});
	});

	describe('when the field is left', () => {
		test('says change with the value, as it is typed when there is nothing to validate it', async () => {
			const wrapper = mountField();

			await type(wrapper, '7');
			await leave(wrapper);

			expect(wrapper.emitted('change')).toEqual([[7]]);
			expect(wrapper.props('modelValue')).toBe(7);
		});

		test('validate is given the value, and its answer is the value that is kept, shown, and said', async () => {
			const validate = vi.fn((value) => Math.min(256, Math.max(value, 4)));
			const wrapper = mountField({ validate });

			await type(wrapper, '900');
			await leave(wrapper);

			expect(validate).toHaveBeenCalledExactlyOnceWith(900);
			expect(wrapper.props('modelValue')).toBe(256);
			expect(wrapper.get('input').element.value).toBe('256');
			expect(wrapper.emitted('change')).toEqual([[256]]);
		});

		test('validate is given an empty string when the field is empty, and a default can be what it answers', async () => {
			const validate = vi.fn((value) => Number.isNaN(parseInt(value)) ? 100 : value);
			const wrapper = mountField({ validate }, 25);

			await type(wrapper, '');
			await leave(wrapper);

			expect(validate).toHaveBeenCalledExactlyOnceWith('');
			expect(wrapper.props('modelValue')).toBe(100);
			expect(wrapper.get('input').element.value).toBe('100');
			expect(wrapper.emitted('change')).toEqual([[100]]);
		});

		test('an empty field goes back to the value that it had when that is the answer', async () => {
			const wrapper = mountField({ validate: () => 5 }, 5);

			await type(wrapper, '');
			await leave(wrapper);

			expect(wrapper.get('input').element.value).toBe('5');
		});

		test('validates what was typed even when the field is left before the parent has caught up with it', async () => {
			// the events of a keyboard are not this close, the ones of a script or a password manager can be
			const validate = vi.fn((value) => value * 2);
			const wrapper = mountField({ validate });
			const input = wrapper.get('input');

			input.element.value = '21';
			input.trigger('input');
			await input.trigger('change');

			expect(validate).toHaveBeenCalledExactlyOnceWith(21);
			expect(wrapper.emitted('change')).toEqual([[42]]);
		});

		test('validate is not called while it is typed', async () => {
			const validate = vi.fn((value) => value);
			const wrapper = mountField({ validate });

			await type(wrapper, '1');
			await type(wrapper, '12');

			expect(validate).not.toHaveBeenCalled();
			expect(wrapper.emitted('change')).toBeUndefined();
		});

		test('the parent has the valid value when it hears change: update comes before it, and a parent saves what it has', async () => {
			// the state of the parent, as it is when `v-model` is a store, and what it has when change is heard
			let state = 5;
			let heard;
			const wrapper = mountField({
				validate: () => 4,
				'onUpdate:modelValue': (value) => { state = value; wrapper.setProps({ modelValue: value }); },
				onChange: (value) => { heard = { argument: value, state }; },
			});

			await type(wrapper, '1');
			expect(state).toBe(1);
			await leave(wrapper);

			expect(heard).toEqual({ argument: 4, state: 4 });
		});
	});
});
