// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FixedButton from '../../../../src/components/ui/FixedButton.vue';
import FixedButtons from '../../../../src/components/ui/FixedButtons.vue';
import { FIXED_SIDE } from '../../../../src/components/ui/fixedButtons';
import { ref } from 'vue';

describe('FixedButtons, a column of them at an edge', () => {
	let warn;
	afterEach(() => warn?.mockRestore());

	const mountGroup = (props = {}, slot = '<FixedButton>One</FixedButton><FixedButton>Two</FixedButton><FixedButton>Three</FixedButton>') => mount(FixedButtons, {
		props: { side: 'right', ...props },
		slots: { default: slot },
		global: { components: { FixedButton } },
	});
	const silence = () => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); };

	test('has its buttons in the order that they are written', () => {
		const wrapper = mountGroup();

		expect(wrapper.findAll('button').map((button) => button.text())).toEqual(['One', 'Two', 'Three']);
	});

	test('puts its buttons at the edge that it is at, and says it once', () => {
		const wrapper = mountGroup({ side: 'left' });

		expect(wrapper.classes()).toEqual(expect.arrayContaining(['fixed-buttons', 'left']));
		expect(wrapper.findAll('button').every((button) => button.classes().includes('left') && !button.classes().includes('right'))).toBe(true);
	});

	test('moves its buttons when the edge changes', async () => {
		const wrapper = mountGroup({ side: 'left' });

		await wrapper.setProps({ side: 'right' });

		expect(wrapper.classes()).toContain('right');
		expect(wrapper.findAll('button').every((button) => button.classes().includes('right') && !button.classes().includes('left'))).toBe(true);
	});

	test('starts at 12% of the window, or where it is told', () => {
		expect(mountGroup().element.style.top).toBe('12%');
		expect(mountGroup({ top: '30%' }).element.style.top).toBe('30%');
		expect(mountGroup({ top: '5rem' }).element.style.top).toBe('5rem');
	});

	test('does not take an edge that it has not got, nor none', () => {
		silence();

		mountGroup({ side: 'top' });
		expect(warn).toHaveBeenCalled();
		warn.mockClear();
		mount(FixedButtons);
		expect(warn).toHaveBeenCalled();
	});

	test('holds other things than buttons, and does not touch them', () => {
		const wrapper = mountGroup({}, '<span class="other">x</span>');

		expect(wrapper.get('.other').text()).toBe('x');
	});
});

describe('FixedButton', () => {
	let warn;
	afterEach(() => warn?.mockRestore());

	const mountButton = (options = {}, side = 'right') => mount(FixedButton, {
		slots: { default: ' New Local Flower ' },
		global: { provide: { [FIXED_SIDE]: ref(side) } },
		...options,
	});

	test('is a button with the text that it is given, and not one of the green and red ones', () => {
		const wrapper = mountButton();

		expect(wrapper.element.tagName).toBe('BUTTON');
		expect(wrapper.text()).toBe('New Local Flower');
		expect(wrapper.classes()).toContain('fixed-button');
		expect(wrapper.classes()).not.toContain('fe-button');
	});

	test('is at the edge of the group that it is in', () => {
		expect(mountButton({}, 'left').classes()).toEqual(expect.arrayContaining(['fixed-button', 'left']));
		expect(mountButton({}, 'right').classes()).toEqual(expect.arrayContaining(['fixed-button', 'right']));
		expect(mountButton({}, 'left').classes()).not.toContain('right');
	});

	test('says so when it is not in a group, and has no edge', () => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const wrapper = mount(FixedButton, { slots: { default: 'Go' } });

		expect(warn).toHaveBeenCalled();
		expect(wrapper.classes()).not.toContain('left');
		expect(wrapper.classes()).not.toContain('right');
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

	test('does not click when it is disabled, and is disabled for the browser: it is the attribute, not a class', async () => {
		const onClick = vi.fn();
		const wrapper = mountButton({ attrs: { onClick, disabled: true } });

		await wrapper.trigger('click');

		expect(wrapper.attributes()).toHaveProperty('disabled');
		expect(wrapper.element.disabled).toBe(true);
		expect(wrapper.classes()).not.toContain('disabled');
		expect(onClick).not.toHaveBeenCalled();
	});

	test('is not disabled when it is not told so, and follows what it is told', async () => {
		const wrapper = mount({
			components: { FixedButtons, FixedButton },
			props: ['off'],
			template: '<FixedButtons side="left"><FixedButton :disabled="off">Go</FixedButton></FixedButtons>',
		}, { props: { off: false } });
		expect(wrapper.get('button').element.disabled).toBe(false);

		await wrapper.setProps({ off: true });
		expect(wrapper.get('button').element.disabled).toBe(true);
	});

	test('has the id, the test id and the title that it is given, they are the ones of the button', () => {
		const wrapper = mountButton({ attrs: { id: 'go', 'data-testid': 'menu-toggle-chatbot', title: 'Opens it' } });

		expect(wrapper.attributes()).toMatchObject({ id: 'go', 'data-testid': 'menu-toggle-chatbot', title: 'Opens it' });
	});
});
