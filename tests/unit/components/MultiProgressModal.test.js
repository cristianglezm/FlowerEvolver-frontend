// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import mitt from 'mitt';
import MultiProgressModal from '../../../src/components/MultiProgressModal.vue';

describe('MultiProgressModal', () => {
	let emitter;
	let wrapper;
	const setup = (extra = {}) => {
		const request = { status: 'setup', title: 'Exporting', onLoad: vi.fn(), ...extra };
		emitter.emit('multi', request);
		return request;
	};
	const init = (name, total) => emitter.emit('multi', { status: 'init', name, progress: 0, total });
	const update = (name, progress) => emitter.emit('multi', { status: 'update', name, progress });
	const dialog = () => wrapper.get('dialog').element;
	const regions = () => wrapper.findAll('[role="region"]');
	const style = (name) => document.getElementById('Bar-' + name).getAttribute('style');

	beforeEach(() => {
		emitter = mitt();
		wrapper = mount(MultiProgressModal, { props: { id: 'multiProgress', channel: emitter, on: 'multi' }, attachTo: document.body });
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		document.body.innerHTML = '';
	});

	test('is a dialog with the id that it is given, as high as it can be, closed until it is set up', () => {
		expect(dialog().id).toBe('multiProgress');
		expect(dialog().open).toBe(false);
		expect(wrapper.classes()).toEqual(expect.arrayContaining(['fit', 'tall']));
		expect(dialog().getAttribute('aria-modal')).toBe('true');
		expect(dialog().getAttribute('aria-labelledby')).toBe('modalTitle');
	});

	test('opens with its title when it is set up, and says that it can start', async () => {
		const request = setup();
		await wrapper.vm.$nextTick();

		expect(dialog().open).toBe(true);
		expect(wrapper.get('#modalTitle').text()).toBe('Exporting');
		expect(request.onLoad).toHaveBeenCalledTimes(1);
		expect(regions()).toHaveLength(0);
	});

	test('has a bar for each thing that starts', async () => {
		setup();
		init('flowers', 20);
		init('species', 5);
		await wrapper.vm.$nextTick();

		expect(regions()).toHaveLength(2);
		expect(wrapper.findAll('[role="progressbar"]').map((bar) => bar.attributes('aria-valuemax'))).toEqual(['20', '5']);
		expect(wrapper.text()).toContain('flowers');
		expect(wrapper.text()).toContain('0.00 / 20');
	});

	test('moves the bar of the one that advances, in a share of its total, and not the others', async () => {
		setup();
		init('flowers', 20);
		init('species', 5);
		await wrapper.vm.$nextTick();

		update('flowers', 5);
		await wrapper.vm.$nextTick();

		expect(style('flowers')).toContain('width: 25%');
		expect(style('flowers')).toContain('background-color: var(--fe-lightgreen)');
		expect(document.getElementById('Bar-species').getAttribute('style')).toBeNull();
		expect(wrapper.text()).toContain('5.00 / 20');
		expect(dialog().open).toBe(true);
	});

	test('takes a bar away when its work is done, and closes when there is none left', async () => {
		setup();
		init('flowers', 2);
		init('species', 4);
		await wrapper.vm.$nextTick();

		update('flowers', 2);
		await wrapper.vm.$nextTick();
		expect(regions()).toHaveLength(1);
		expect(dialog().open).toBe(true);

		update('species', 4);
		await wrapper.vm.$nextTick();
		expect(dialog().open).toBe(false);
	});

	test('has no way to close it by hand, there is nothing to answer', () => {
		expect(wrapper.find('.fe-modal-close').exists()).toBe(false);
		expect(wrapper.find('button').exists()).toBe(false);
	});

	test('listens while it is there, and does not when it is unmounted', () => {
		expect(emitter.all.get('multi')).toHaveLength(1);

		wrapper.unmount();
		wrapper = undefined;

		expect(emitter.all.get('multi') ?? []).toHaveLength(0);
	});

	test('leaves the listeners of others on its events when it is unmounted', () => {
		const others = ['multi'].map((event) => {
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
