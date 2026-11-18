// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import mitt from 'mitt';
import ProgressModal from '../../../src/components/ProgressModal.vue';

describe('ProgressModal', () => {
	let emitter;
	let wrapper;
	const start = (extra = {}) => {
		const request = { title: 'Importing', progress: 0, total: 10, onLoad: vi.fn(), ...extra };
		emitter.emit('showProgress', request);
		return request;
	};
	const dialog = () => wrapper.get('dialog').element;
	const numbers = () => wrapper.findAll('h1')[1].text();
	const bar = () => document.getElementById('Bar');

	beforeEach(() => {
		emitter = mitt();
		wrapper = mount(ProgressModal, { props: { id: 'progressBar', channel: emitter, on: 'showProgress', update: 'updateProgress' }, attachTo: document.body });
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		document.body.innerHTML = '';
	});

	test('is a dialog with the id that it is given, fit to what it holds, closed until there is something to show', () => {
		expect(dialog().id).toBe('progressBar');
		expect(dialog().open).toBe(false);
		expect(wrapper.classes()).toContain('fit');
	});

	test('opens with the title and how far it is, and then says that it can start', async () => {
		const request = start({ progress: 2 });
		await wrapper.vm.$nextTick();

		expect(dialog().open).toBe(true);
		expect(wrapper.findAll('h1')[0].text()).toBe('Importing');
		expect(numbers()).toBe('2 / 10');
		expect(request.onLoad).toHaveBeenCalledTimes(1);
	});

	test('moves the bar as the progress is told, in a share of the total', async () => {
		start();
		emitter.emit('updateProgress', { progress: 4 });
		await wrapper.vm.$nextTick();

		expect(numbers()).toBe('4 / 10');
		expect(bar().getAttribute('style')).toContain('width: 40%');
		expect(bar().getAttribute('style')).toContain('background-color: var(--fe-lightgreen)');
		emitter.emit('updateProgress', { progress: 7 });
		await wrapper.vm.$nextTick();
		expect(bar().getAttribute('style')).toContain('width: 70%');
		expect(dialog().open).toBe(true);
	});

	test('closes when the total is reached', async () => {
		start();

		emitter.emit('updateProgress', { progress: 10 });
		await wrapper.vm.$nextTick();

		expect(bar().getAttribute('style')).toContain('width: 100%');
		expect(dialog().open).toBe(false);
	});

	test('has no way to close it by hand, there is nothing to answer', () => {
		expect(wrapper.find('.fe-modal-close').exists()).toBe(false);
		expect(wrapper.find('button').exists()).toBe(false);
	});

	test('listens while it is there, and does not when it is unmounted', () => {
		expect(emitter.all.get('showProgress')).toHaveLength(1);
		expect(emitter.all.get('updateProgress')).toHaveLength(1);

		wrapper.unmount();
		wrapper = undefined;

		expect(emitter.all.get('showProgress') ?? []).toHaveLength(0);
		expect(emitter.all.get('updateProgress') ?? []).toHaveLength(0);
	});

	test('leaves the listeners of others on its events when it is unmounted', () => {
		const others = ['showProgress', 'updateProgress'].map((event) => {
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
