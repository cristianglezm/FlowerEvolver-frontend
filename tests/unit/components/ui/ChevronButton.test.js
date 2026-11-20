// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ChevronButton from '../../../../src/components/ui/ChevronButton.vue';

describe('ChevronButton', () => {
	const path = (wrapper) => wrapper.get('path').attributes('d');

	test('is a button of type button, with a name, and closed when it is not told else', () => {
		const wrapper = mount(ChevronButton);

		expect(wrapper.element.tagName).toBe('BUTTON');
		expect(wrapper.attributes('type')).toBe('button');
		expect(wrapper.attributes('aria-label')).toBe('Flower menu');
		expect(wrapper.attributes('aria-expanded')).toBe('false');
	});

	test('is turned over when the menu is open, and back when it is closed again', async () => {
		const wrapper = mount(ChevronButton, { props: { open: false } });
		const closed = path(wrapper);

		await wrapper.setProps({ open: true });
		const open = path(wrapper);

		expect(open).not.toBe(closed);
		expect(wrapper.attributes('aria-expanded')).toBe('true');
		await wrapper.setProps({ open: false });
		expect(path(wrapper)).toBe(closed);
		expect(wrapper.findAll('svg')).toHaveLength(1);
	});

	test('says click when it is clicked, and does not turn over by itself', async () => {
		const onClick = vi.fn();
		const wrapper = mount(ChevronButton, { attrs: { onClick } });
		const closed = path(wrapper);

		await wrapper.trigger('click');

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(path(wrapper)).toBe(closed);
	});

	test('has the test id that it is given, it is the one of the button', () => {
		const wrapper = mount(ChevronButton, { attrs: { 'data-testid': 'flower-menu-toggle' } });

		expect(wrapper.attributes('data-testid')).toBe('flower-menu-toggle');
	});

	test('has the colour of the text around it, not one of its own', () => {
		const wrapper = mount(ChevronButton);

		expect(wrapper.get('svg').classes()).toContain('svg-icon-fill');
	});
});
