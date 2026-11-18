// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RangeField from '../../../../src/components/ui/RangeField.vue';

describe('RangeField', () => {
	const mountField = (props = {}) => {
		const wrapper = mount(RangeField, {
			props: {
				label: 'Magnification:', inputId: 'magnification-range', modelValue: 4,
				'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
				...props,
			},
		});
		return wrapper;
	};
	// what is typed, and nothing else: setValue of the test utils also says that the field was left
	const slide = async (wrapper, value) => {
		const input = wrapper.get('input');
		input.element.value = String(value);
		await input.trigger('input');
	};
	const release = async (wrapper) => {
		await wrapper.get('input').trigger('change');
	};
	const text = (wrapper) => wrapper.get('.range-value').text();

	describe('a value of its own units, like the zoom', () => {
		const zoom = (props = {}) => mountField({ min: 4, max: 16, step: 2, suffix: 'x', ...props });

		test('is a range input with the id that its label is for', () => {
			const wrapper = zoom({ tooltip: 'the zoom' });
			const input = wrapper.get('input');

			expect(input.attributes('type')).toBe('range');
			expect(input.attributes('id')).toBe('magnification-range');
			expect(wrapper.get('label').attributes('for')).toBe('magnification-range');
			expect(wrapper.find('.tipInfo').exists()).toBe(true);
		});

		test('has the min, the max and the step that it is given', () => {
			expect(zoom().get('input').attributes()).toMatchObject({ min: '4', max: '16', step: '2' });
		});

		test('shows the value that it is given, with the suffix, and the slider at it', () => {
			const wrapper = zoom({ modelValue: 8 });

			expect(text(wrapper)).toBe('8x');
			expect(wrapper.get('input').element.value).toBe('8');
		});

		test('v-model follows the slider, as a number, and the text follows v-model', async () => {
			const wrapper = zoom();

			await slide(wrapper, 12);

			expect(wrapper.props('modelValue')).toBe(12);
			expect(text(wrapper)).toBe('12x');
		});

		test('says change with the value when the slider is let go, and not while it moves', async () => {
			const wrapper = zoom();

			await slide(wrapper, 10);
			await slide(wrapper, 14);
			expect(wrapper.emitted('change')).toBeUndefined();

			await release(wrapper);
			expect(wrapper.emitted('change')).toEqual([[14]]);
		});

		test('says change with the value that the slider was let go at, even before the parent has caught up with it', async () => {
			const wrapper = zoom();
			const input = wrapper.get('input');

			input.element.value = '14';
			input.trigger('input');
			await input.trigger('change');

			expect(wrapper.emitted('change')).toEqual([[14]]);
			expect(text(wrapper)).toBe('14x');
		});

		test('has no suffix when it is not given one', () => {
			expect(mountField({ modelValue: 7 }).get('.range-value').text()).toBe('7');
		});

		test('format is the text after the slider, in place of the value and the suffix', () => {
			const format = vi.fn((value) => `${value} times`);
			const wrapper = zoom({ modelValue: 6, format });

			expect(text(wrapper)).toBe('6 times');
			expect(format).toHaveBeenCalledWith(6);
		});
	});

	describe('a percent, a value from 0 to 1', () => {
		const rate = (props = {}) => mountField({ percent: true, min: 0, max: 1, step: 0.01, modelValue: 0.35, ...props });

		test('has the slider from 0 to 100 in steps of 1, for a value from 0 to 1 in steps of 0.01', () => {
			expect(rate().get('input').attributes()).toMatchObject({ min: '0', max: '100', step: '1' });
		});

		test('shows the value as a percentage, and the slider at it', () => {
			const wrapper = rate();

			expect(text(wrapper)).toBe('35%');
			expect(wrapper.get('input').element.value).toBe('35');
		});

		test('the slider never has a step of less than 1, a finer step of the value is still a whole percent', () => {
			expect(rate({ step: 0.001 }).get('input').attributes('step')).toBe('1');
			expect(rate({ step: 0.05 }).get('input').attributes('step')).toBe('5');
		});

		test('v-model is from 0 to 1 when the slider moves: 70 is 0.7', async () => {
			const wrapper = rate();

			await slide(wrapper, 70);

			expect(wrapper.props('modelValue')).toBe(0.7);
			expect(text(wrapper)).toBe('70%');
		});

		test('v-model has no error of floating point: 7 is 0.07 and 29 is 0.29', async () => {
			const wrapper = rate();

			await slide(wrapper, 7);
			expect(wrapper.props('modelValue')).toBe(0.07);

			await slide(wrapper, 29);
			expect(wrapper.props('modelValue')).toBe(0.29);
		});

		test('the ends are 0 and 1', async () => {
			const wrapper = rate();

			await slide(wrapper, 0);
			expect(wrapper.props('modelValue')).toBe(0);
			expect(text(wrapper)).toBe('0%');

			await slide(wrapper, 100);
			expect(wrapper.props('modelValue')).toBe(1);
			expect(text(wrapper)).toBe('100%');
		});

		test('says change with the value from 0 to 1 when the slider is let go', async () => {
			const wrapper = rate();

			await slide(wrapper, 60);
			await release(wrapper);

			expect(wrapper.emitted('change')).toEqual([[0.6]]);
		});

		test('a value that is not a whole percent shows what it is, and does not change until the slider is moved', async () => {
			const wrapper = rate({ modelValue: 0.123 });

			expect(text(wrapper)).toBe('12.3%');
			expect(wrapper.get('input').element.value).toBe('12');

			await release(wrapper);
			expect(wrapper.props('modelValue')).toBe(0.123);
			expect(wrapper.emitted('change')).toEqual([[0.123]]);
		});

		test('shows the value when the parent changes it', async () => {
			const wrapper = rate();

			await wrapper.setProps({ modelValue: 0.6 });

			expect(text(wrapper)).toBe('60%');
			expect(wrapper.get('input').element.value).toBe('60');
		});

		test('the suffix is not for a percent', () => {
			expect(text(rate({ suffix: 'x' }))).toBe('35%');
		});
	});

	describe('what it can be told', () => {
		test('a test id and disabled go to the input, and none of them are there when it is not told', () => {
			const told = mountField({ testid: 'rate-add', disabled: true }).get('input').attributes();
			expect(told).toMatchObject({ 'data-testid': 'rate-add' });
			expect(told).toHaveProperty('disabled');

			const plain = mountField().get('input').attributes();
			expect(plain).not.toHaveProperty('data-testid');
			expect(plain).not.toHaveProperty('disabled');
		});

		test('is one element, that takes the id and the class that it is given', () => {
			const wrapper = mount(RangeField, {
				props: { label: 'Magnification:', inputId: 'magnification-range', modelValue: 4 },
				attrs: { id: 'magnification-option', class: 'option-box' },
			});

			expect(wrapper.element.id).toBe('magnification-option');
			expect(wrapper.classes()).toContain('option-box');
		});
	});
});
