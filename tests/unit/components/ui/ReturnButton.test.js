// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ReturnButton from '../../../../src/components/ui/ReturnButton.vue';

describe('ReturnButton', () => {
	test('is a green button that says back to top', () => {
		const wrapper = mount(ReturnButton);

		expect(wrapper.element.tagName).toBe('BUTTON');
		expect(wrapper.text()).toBe('back to top');
		expect(wrapper.classes()).toEqual(expect.arrayContaining(['return-button', 'fe-button', 'safe-button']));
		expect(wrapper.attributes('type')).toBe('button');
		// the size of the green buttons, not the small one
		expect(wrapper.classes()).not.toContain('small');
	});

	test('says what it is told to say', () => {
		expect(mount(ReturnButton, { slots: { default: 'up' } }).text()).toBe('up');
	});

	test('says click when it is clicked, and has the test id that it is given', async () => {
		const onClick = vi.fn();
		const wrapper = mount(ReturnButton, { attrs: { onClick, 'data-testid': 'back-to-top' } });

		await wrapper.trigger('click');

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(wrapper.attributes('data-testid')).toBe('back-to-top');
	});
});
