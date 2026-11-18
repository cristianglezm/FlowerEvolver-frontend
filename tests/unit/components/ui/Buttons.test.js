// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SafeButton from '../../../../src/components/ui/SafeButton.vue';
import UnsafeButton from '../../../../src/components/ui/UnsafeButton.vue';

describe.each([
	['SafeButton', SafeButton, 'safe-button'],
	['UnsafeButton', UnsafeButton, 'unsafe-button'],
])('%s', (name, Component, className) => {
	const mountButton = (options = {}) => mount(Component, { slots: { default: ' Delete All Flowers ' }, ...options });

	test('is a button with the text that it is given', () => {
		const wrapper = mountButton();

		expect(wrapper.element.tagName).toBe('BUTTON');
		expect(wrapper.text()).toBe('Delete All Flowers');
		expect(wrapper.classes()).toEqual(expect.arrayContaining(['fe-button', className]));
	});

	test('is a button of type button, which is not a submit, unless it is told another one', () => {
		expect(mountButton().attributes('type')).toBe('button');
		expect(mountButton({ attrs: { type: 'submit' } }).attributes('type')).toBe('submit');
	});

	test('says click when it is clicked, with the event of the button', async () => {
		const onClick = vi.fn();
		const wrapper = mountButton({ attrs: { onClick } });

		await wrapper.trigger('click');

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onClick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
	});

	test('does not click when it is disabled, and is disabled for the browser: it is the attribute', async () => {
		const onClick = vi.fn();
		const wrapper = mountButton({ attrs: { onClick, disabled: true } });

		await wrapper.trigger('click');

		expect(wrapper.attributes()).toHaveProperty('disabled');
		expect(wrapper.element.disabled).toBe(true);
		expect(onClick).not.toHaveBeenCalled();
	});

	test('is not disabled when it is not told so, and follows what it is told', async () => {
		const wrapper = mount({
			components: { Component },
			props: ['off'],
			template: '<Component :disabled="off">Go</Component>',
		}, { props: { off: false } });
		expect(wrapper.element.disabled).toBe(false);

		await wrapper.setProps({ off: true });
		expect(wrapper.element.disabled).toBe(true);
	});

	test('has the id, the test id, the title and the class that it is given, they are the ones of the button', () => {
		const wrapper = mountButton({ attrs: { id: 'go', 'data-testid': 'finetune-start', title: 'Starts it', class: 'extra' } });

		expect(wrapper.attributes()).toMatchObject({ id: 'go', 'data-testid': 'finetune-start', title: 'Starts it' });
		expect(wrapper.classes()).toEqual(expect.arrayContaining(['extra', className]));
	});

	test('is normal, and small when it is told', () => {
		expect(mountButton().classes()).not.toContain('small');
		expect(mountButton({ props: { size: 'small' } }).classes()).toContain('small');
		expect(mountButton({ props: { size: 'normal' } }).classes()).not.toContain('small');
	});

	test('does not take a size that it has not got', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		mountButton({ props: { size: 'huge' } });

		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	test('can have more than text in it', () => {
		const wrapper = mount(Component, { slots: { default: '<span class="icon">+</span> More' } });

		expect(wrapper.find('.icon').exists()).toBe(true);
		expect(wrapper.text()).toBe('+ More');
	});
});

describe('SafeButton, the sizes of the buttons of a card', () => {
	test.each(['compact', 'symbol'])('%s is its own size, and not the small one', (size) => {
		const classes = mount(SafeButton, { props: { size } }).classes();

		expect(classes).toContain(size);
		expect(classes).not.toContain('small');
		expect(classes).not.toContain('normal');
	});

	test.each(['compact', 'symbol'])('%s is a size that it has, and says nothing', (size) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		mount(SafeButton, { props: { size } });

		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	test('normal has no class of size', () => {
		expect(mount(SafeButton).classes()).toEqual(['fe-button', 'safe-button']);
	});
});
