// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ModalDialog from '../../../../src/components/ui/ModalDialog.vue';

describe('ModalDialog', () => {
	let wrapper;
	const mountDialog = (props = {}, options = {}) => {
		wrapper = mount(ModalDialog, { props, slots: { default: '<p class="inside">what it holds</p>' }, attachTo: document.body, ...options });
		return wrapper;
	};
	const dialog = () => wrapper.get('dialog').element;
	const cancel = () => {
		const event = new Event('cancel', { cancelable: true });
		dialog().dispatchEvent(event);
		return event;
	};

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		document.body.innerHTML = '';
	});

	describe('as a dialog', () => {
		test('is a dialog that is closed, with what it is given inside', () => {
			mountDialog();

			expect(wrapper.element.tagName).toBe('DIALOG');
			expect(dialog().open).toBe(false);
			expect(wrapper.get('.inside').text()).toBe('what it holds');
		});

		test('opens and closes when the one that has it says so', () => {
			mountDialog();

			wrapper.vm.open();
			expect(dialog().open).toBe(true);

			wrapper.vm.close();
			expect(dialog().open).toBe(false);
		});

		test('has the id and the test id that it is given, they are the ones of the dialog', () => {
			mountDialog({}, { attrs: { id: 'globalConfirm', 'data-testid': 'confirm-modal' } });

			expect(dialog().id).toBe('globalConfirm');
			expect(dialog().getAttribute('data-testid')).toBe('confirm-modal');
			expect(document.getElementById('globalConfirm')).toBe(dialog());
		});

		test('says close when it is closed by the one that has it', () => {
			mountDialog();
			wrapper.vm.open();

			wrapper.vm.close();

			expect(wrapper.emitted('close')).toHaveLength(1);
		});

		test('says close when it is closed by the browser, which is what Esc does', () => {
			mountDialog();
			wrapper.vm.open();

			dialog().dispatchEvent(new Event('close'));

			expect(wrapper.emitted('close')).toHaveLength(1);
		});

		test('says nothing while it stays closed', () => {
			mountDialog();

			expect(wrapper.emitted('close')).toBeUndefined();
			expect(wrapper.emitted('dismiss')).toBeUndefined();
		});
	});

	describe('the header', () => {
		test('is not there without a title', () => {
			mountDialog({ closable: true });

			expect(wrapper.find('.fe-modal-header').exists()).toBe(false);
			expect(wrapper.find('h2').exists()).toBe(false);
			expect(wrapper.find('button').exists()).toBe(false);
		});

		test('has the title that it is given', () => {
			mountDialog({ title: 'Delete Action' });

			expect(wrapper.get('h2').text()).toBe('Delete Action');
		});

		test('has no × unless it is closable', () => {
			mountDialog({ title: 'Delete Action' });

			expect(wrapper.find('.fe-modal-close').exists()).toBe(false);
		});

		test('has a × when it is closable, a button with a name', () => {
			mountDialog({ title: 'Delete Action', closable: true });
			const close = wrapper.get('.fe-modal-close');

			expect(close.element.tagName).toBe('BUTTON');
			expect(close.attributes('type')).toBe('button');
			expect(close.attributes('aria-label')).toBe('Close');
			expect(close.text()).toBe('\u00d7');
		});

		test('says dismiss when the × is pressed, and does not close by itself', async () => {
			mountDialog({ title: 'Delete Action', closable: true });
			wrapper.vm.open();

			await wrapper.get('.fe-modal-close').trigger('click');

			expect(wrapper.emitted('dismiss')).toHaveLength(1);
			expect(dialog().open).toBe(true);
			expect(wrapper.emitted('close')).toBeUndefined();
		});
	});

	describe('locked', () => {
		test('keeps Esc from closing it', () => {
			mountDialog({ locked: true });

			expect(cancel().defaultPrevented).toBe(true);
		});

		test('lets Esc close it when it is not locked', () => {
			mountDialog();

			expect(cancel().defaultPrevented).toBe(false);
		});

		test('follows the lock as it changes', async () => {
			mountDialog({ locked: false });
			expect(cancel().defaultPrevented).toBe(false);

			await wrapper.setProps({ locked: true });
			expect(cancel().defaultPrevented).toBe(true);

			await wrapper.setProps({ locked: false });
			expect(cancel().defaultPrevented).toBe(false);
		});

		test('disables the × as a button, with the attribute', async () => {
			mountDialog({ title: 'Running', closable: true, locked: true });
			const close = wrapper.get('.fe-modal-close');

			await close.trigger('click');

			expect(close.element.disabled).toBe(true);
			expect(wrapper.emitted('dismiss')).toBeUndefined();
			await wrapper.setProps({ locked: false });
			expect(close.element.disabled).toBe(false);
		});

		test('is closed by the one that has it all the same: it knows when it can', () => {
			mountDialog({ locked: true });
			wrapper.vm.open();

			wrapper.vm.close();

			expect(dialog().open).toBe(false);
		});
	});

	describe('the size', () => {
		test('is wide when it is not said, and not tall', () => {
			mountDialog();

			expect(wrapper.classes()).toEqual(expect.arrayContaining(['fe-modal', 'wide']));
			expect(wrapper.classes()).not.toContain('tall');
		});

		test.each(['wide', 'fit', 'form'])('%s is its own class and no other', (size) => {
			mountDialog({ size });

			expect(wrapper.classes()).toContain(size);
			expect(['wide', 'fit', 'form'].filter((other) => wrapper.classes().includes(other))).toEqual([size]);
		});

		test('is tall when it is told', () => {
			mountDialog({ tall: true });

			expect(wrapper.classes()).toContain('tall');
		});

		test('does not take a size that it has not got', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

			mountDialog({ size: 'huge' });

			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});
	});
});
