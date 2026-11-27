// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import mitt from 'mitt';
import ConfirmModal from '../../../src/components/ConfirmModal.vue';

describe('ConfirmModal', () => {
	let emitter;
	let wrapper;
	const ask = (extra = {}) => {
		const question = { title: 'Delete Action', message: 'Do you wanna delete flower 3?', btnNo: 'No', btnYes: 'Delete Flower', onConfirm: vi.fn(), ...extra };
		emitter.emit('showYesNo', question);
		return question;
	};
	const shown = async () => {
		await vi.advanceTimersByTimeAsync(20);
	};
	const dialog = () => wrapper.get('dialog').element;
	const yes = () => wrapper.get('[data-testid="confirm-yes"]');
	const no = () => wrapper.get('[data-testid="confirm-no"]');

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		emitter = mitt();
		wrapper = mount(ConfirmModal, { props: { id: 'globalConfirm', channel: emitter, on: 'showYesNo' }, attachTo: document.body });
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	test('is a dialog with the id that it is given, closed until it is asked something', () => {
		expect(dialog().id).toBe('globalConfirm');
		expect(document.getElementById('globalConfirm')).toBe(dialog());
		expect(dialog().open).toBe(false);
	});

	test('shows the question it is asked, with its own words on the buttons, a moment after', async () => {
		ask();
		expect(dialog().open).toBe(false);

		await shown();

		expect(dialog().open).toBe(true);
		expect(wrapper.get('h2').text()).toBe('Delete Action');
		expect(wrapper.get('p').text()).toBe('Do you wanna delete flower 3?');
		expect(no().text()).toBe('No');
		expect(yes().text()).toBe('Delete Flower');
		expect(no().classes()).toContain('safe-button');
		expect(yes().classes()).toContain('safe-button');
	});

	test('does what it was asked to when the answer is yes, and closes', async () => {
		const question = ask();
		await shown();

		await yes().trigger('click');

		expect(question.onConfirm).toHaveBeenCalledTimes(1);
		expect(dialog().open).toBe(false);
	});

	test('does nothing when the answer is no, and closes', async () => {
		const question = ask();
		await shown();

		await no().trigger('click');

		expect(question.onConfirm).not.toHaveBeenCalled();
		expect(dialog().open).toBe(false);
	});

	test('the × is a no', async () => {
		const question = ask();
		await shown();

		await wrapper.get('.fe-modal-close').trigger('click');

		expect(question.onConfirm).not.toHaveBeenCalled();
		expect(dialog().open).toBe(false);
	});

	test('asks the questions in the order they came, when they come together, and closes after the last', async () => {
		const first = ask({ title: 'First', onConfirm: vi.fn() });
		const second = ask({ title: 'Second', onConfirm: vi.fn() });
		const third = ask({ title: 'Third', onConfirm: vi.fn() });
		await shown();
		expect(wrapper.get('h2').text()).toBe('First');

		await no().trigger('click');
		expect(dialog().open).toBe(true);
		expect(wrapper.get('h2').text()).toBe('Second');
		await yes().trigger('click');
		expect(wrapper.get('h2').text()).toBe('Third');
		await yes().trigger('click');

		expect(dialog().open).toBe(false);
		expect(first.onConfirm).not.toHaveBeenCalled();
		expect(second.onConfirm).toHaveBeenCalledTimes(1);
		expect(third.onConfirm).toHaveBeenCalledTimes(1);
	});

	test('a question that comes while another is open waits for it, and does not replace it', async () => {
		const first = ask({ title: 'First', onConfirm: vi.fn() });
		await shown();

		const second = ask({ title: 'Second', onConfirm: vi.fn() });
		await shown();
		expect(wrapper.get('h2').text()).toBe('First');

		await yes().trigger('click');
		expect(first.onConfirm).toHaveBeenCalledTimes(1);
		expect(second.onConfirm).not.toHaveBeenCalled();
		expect(dialog().open).toBe(true);
		expect(wrapper.get('h2').text()).toBe('Second');

		await yes().trigger('click');
		expect(second.onConfirm).toHaveBeenCalledTimes(1);
		expect(dialog().open).toBe(false);
	});

	test('the buttons answer the question that is shown, not one that is waiting', async () => {
		const first = ask({ title: 'First', onConfirm: vi.fn() });
		await shown();
		const second = ask({ title: 'Second', onConfirm: vi.fn() });
		await shown();

		await yes().trigger('click');

		expect(first.onConfirm).toHaveBeenCalledTimes(1);
		expect(second.onConfirm).not.toHaveBeenCalled();
	});

	test('the × and Esc are a no and go on to the next question', async () => {
		const first = ask({ title: 'First', onConfirm: vi.fn() });
		await shown();
		ask({ title: 'Second', onConfirm: vi.fn() });
		await shown();

		await wrapper.get('.fe-modal-close').trigger('click');

		expect(first.onConfirm).not.toHaveBeenCalled();
		expect(dialog().open).toBe(true);
		expect(wrapper.get('h2').text()).toBe('Second');
	});

	test('answers a question that it was asked after it was closed', async () => {
		ask({ title: 'One' });
		await shown();
		await no().trigger('click');

		ask({ title: 'Two' });
		await shown();

		expect(dialog().open).toBe(true);
		expect(wrapper.get('h2').text()).toBe('Two');
	});

	test('listens to what it is told to while it is there, and does not when it is unmounted', () => {
		expect(emitter.all.get('showYesNo')).toHaveLength(1);

		wrapper.unmount();
		wrapper = undefined;

		expect(emitter.all.get('showYesNo') ?? []).toHaveLength(0);
	});

	test('leaves the listeners of others on its events when it is unmounted', () => {
		const others = ['showYesNo'].map((event) => {
			const other = vi.fn();
			emitter.on(event, other);
			return [event, other];
		});

		wrapper.unmount();
		wrapper = undefined;
		for(const [event, other] of others){
			emitter.emit(event, {});
			expect(other, event).toHaveBeenCalledTimes(1);
		}
	});
});
