// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PageButton from '../../../../src/components/ui/PageButton.vue';

describe('PageButton', () => {
	test.each([
		['previous', '<', 'Previous page'],
		['next', '>', 'Next page'],
	])('%s is a button named by the arrow %s, with a title', (direction, arrow, title) => {
		const wrapper = mount(PageButton, { props: { direction } });

		expect(wrapper.element.tagName).toBe('BUTTON');
		expect(wrapper.attributes('type')).toBe('button');
		expect(wrapper.text()).toBe(arrow);
		expect(wrapper.attributes('title')).toBe(title);
	});

	test('says click when it is clicked, and has the test id that it is given', async () => {
		const onClick = vi.fn();
		const wrapper = mount(PageButton, { props: { direction: 'next' }, attrs: { onClick, 'data-testid': 'page-next-top' } });

		await wrapper.trigger('click');

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(wrapper.attributes('data-testid')).toBe('page-next-top');
	});

	test('does not click when it is disabled, and is disabled for the browser: it is the attribute, not a class', async () => {
		const onClick = vi.fn();
		const wrapper = mount(PageButton, { props: { direction: 'next' }, attrs: { onClick, disabled: true } });

		await wrapper.trigger('click');

		expect(wrapper.element.disabled).toBe(true);
		expect(wrapper.classes()).not.toContain('disabled');
		expect(onClick).not.toHaveBeenCalled();
	});

	test('does not take a direction that it has not got, nor none', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		mount(PageButton, { props: { direction: 'up' } });
		expect(warn).toHaveBeenCalled();
		warn.mockClear();
		mount(PageButton);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});
