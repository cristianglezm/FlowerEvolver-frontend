// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { defineComponent, reactive, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import CheckboxField from '../../../../src/components/ui/CheckboxField.vue';

// the field the way it is used: the owner has the value and says what to do when it changes
const hosted = (initial = false, extra = '') => {
	const state = reactive({ on: initial });
	const seen = [];
	const wrapper = mount(defineComponent({
		components: { CheckboxField },
		setup: () => ({ state, seen, record: (checked) => seen.push({ checked, inTheOwner: state.on }) }),
		template: `<CheckboxField v-model="state.on" input-id="opt" label="Option: " tooltip="what it does" testid="opt-test" ${extra} @change="record" />`,
	}));
	return { wrapper, state, seen };
};

describe('CheckboxField', () => {
	test('is a row with its label for the box, its tooltip, and the box with the id and test id that it is given', () => {
		const { wrapper } = hosted();
		const input = wrapper.get('input');

		expect(input.attributes()).toMatchObject({ type: 'checkbox', id: 'opt', 'data-testid': 'opt-test' });
		expect(wrapper.get('label').attributes('for')).toBe('opt');
		expect(wrapper.get('label').text()).toBe('Option:');
		expect(wrapper.find('.field-row').exists()).toBe(true);
		expect(input.classes()).toEqual(expect.arrayContaining(['choice', 'checkbox']));
	});

	test('is checked when the value is, and not when it is not', () => {
		expect(hosted(true).wrapper.get('input').element.checked).toBe(true);
		expect(hosted(false).wrapper.get('input').element.checked).toBe(false);
	});

	test('follows the value when the owner changes it', async () => {
		const { wrapper, state } = hosted(false);

		state.on = true;
		await wrapper.vm.$nextTick();
		expect(wrapper.get('input').element.checked).toBe(true);

		state.on = false;
		await wrapper.vm.$nextTick();
		expect(wrapper.get('input').element.checked).toBe(false);
	});

	test('gives the owner the new value when it is clicked, and says change with it', async () => {
		const { wrapper, state, seen } = hosted(false);

		await wrapper.get('input').setValue(true);

		expect(state.on).toBe(true);
		expect(seen).toEqual([{ checked: true, inTheOwner: true }]);
	});

	test('does the same when it is unchecked', async () => {
		const { wrapper, state, seen } = hosted(true);

		await wrapper.get('input').setValue(false);

		expect(state.on).toBe(false);
		expect(seen).toEqual([{ checked: false, inTheOwner: false }]);
	});

	test('has the value in the owner by the time that change is said: what the owner does then finds it already there', async () => {
		const { wrapper, seen } = hosted(false);

		await wrapper.get('input').setValue(true);
		await wrapper.get('input').setValue(false);
		await wrapper.get('input').setValue(true);

		expect(seen.map((entry) => entry.checked === entry.inTheOwner)).toEqual([true, true, true]);
	});

	test('does not say change before it is clicked, nor when the owner changes the value', async () => {
		const { wrapper, state, seen } = hosted(false);

		state.on = true;
		await wrapper.vm.$nextTick();

		expect(seen).toEqual([]);
	});

	describe('an owner that does not take the value', () => {
		// an owner that takes the value and puts it back at once, as one does for what the browser cannot do
		const refusing = () => {
			const state = reactive({ on: false });
			const wrapper = mount(defineComponent({
				components: { CheckboxField },
				setup: () => ({ state, refuse: () => { state.on = false; } }),
				template: '<CheckboxField v-model="state.on" input-id="opt" label="Option: " @change="refuse" />',
			}), { attachTo: document.body });
			return { wrapper, state };
		};

		test('shows what the owner has, not what the browser did: it goes back when the owner puts the value back at once', async () => {
			const { wrapper, state } = refusing();

			await wrapper.get('input').setValue(true);
			await nextTick();

			expect(state.on).toBe(false);
			expect(wrapper.get('input').element.checked).toBe(false);
			wrapper.unmount();
		});

		test('goes back each time that it is tried, not only the first', async () => {
			const { wrapper } = refusing();

			for(let i = 0; i < 3; i++){
				await wrapper.get('input').setValue(true);
				await nextTick();
				expect(wrapper.get('input').element.checked).toBe(false);
			}
			wrapper.unmount();
		});

		test('says change with what the box said, even if the owner puts it back', async () => {
			const seen = [];
			const state = reactive({ on: false });
			const wrapper = mount(defineComponent({
				components: { CheckboxField },
				setup: () => ({ state, record: (checked) => { seen.push(checked); state.on = false; } }),
				template: '<CheckboxField v-model="state.on" input-id="opt" label="Option: " @change="record" />',
			}), { attachTo: document.body });

			await wrapper.get('input').setValue(true);
			await nextTick();

			expect(seen).toEqual([true]);
			wrapper.unmount();
		});

		test('is as the owner says when the owner takes the value later, after something that it waits for', async () => {
			const state = reactive({ on: false });
			const wrapper = mount(defineComponent({
				components: { CheckboxField },
				setup: () => ({ state, grant: async () => { await Promise.resolve(); state.on = true; } }),
				template: '<CheckboxField v-model="state.on" input-id="opt" label="Option: " @change="grant" />',
			}), { attachTo: document.body });

			await wrapper.get('input').setValue(true);
			await nextTick();
			await nextTick();

			expect(wrapper.get('input').element.checked).toBe(true);
			wrapper.unmount();
		});

		test('leaves the other boxes as they are', async () => {
			const { wrapper } = refusing();
			const other = document.createElement('input');
			other.type = 'checkbox';
			other.checked = true;
			document.body.appendChild(other);

			await wrapper.get('input').setValue(true);
			await nextTick();

			expect(other.checked).toBe(true);
			wrapper.unmount();
			other.remove();
		});
	});

	test('is disabled with the attribute, and does nothing then', async () => {
		const { wrapper, state, seen } = hosted(false, ':disabled="true"');
		const input = wrapper.get('input');

		await input.trigger('click');

		expect(input.element.disabled).toBe(true);
		expect(input.attributes()).toHaveProperty('disabled');
		expect(state.on).toBe(false);
		expect(seen).toEqual([]);
	});

	test('the id and the class that are given to the field are the ones of the row', () => {
		const wrapper = mount(CheckboxField, { props: { inputId: 'a', label: 'A' }, attrs: { id: 'a-option', class: 'option-box' } });

		expect(wrapper.attributes('id')).toBe('a-option');
		expect(wrapper.classes()).toEqual(expect.arrayContaining(['field-row', 'option-box']));
	});

	test('says what it needs: a label and an id', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		mount(CheckboxField);

		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});
