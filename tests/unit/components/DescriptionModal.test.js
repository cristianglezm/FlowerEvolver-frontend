// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import mitt from 'mitt';
import DescriptionModal from '../../../src/components/DescriptionModal.vue';

describe('DescriptionModal', () => {
	let emitter;
	let wrapper;
	const show = (extra = {}) => emitter.emit('showDescriptionModal', { FlowerID: 5, FlowerImage: 'data:image/png;base64,AAA', ...extra });
	const describeIt = (description) => emitter.emit('updateDesc', { loading: false, description });
	const dialog = () => wrapper.get('dialog').element;

	beforeEach(() => {
		emitter = mitt();
		wrapper = mount(DescriptionModal, { props: { id: 'descriptionModal', channel: emitter, on: 'showDescriptionModal', update: 'updateDesc' }, attachTo: document.body });
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		document.body.innerHTML = '';
	});

	test('is a dialog with the id that it is given, closed until a flower is shown', () => {
		expect(dialog().id).toBe('descriptionModal');
		expect(dialog().open).toBe(false);
	});

	test('shows the flower, and that its description is being made', async () => {
		show();
		await wrapper.vm.$nextTick();

		expect(dialog().open).toBe(true);
		expect(wrapper.get('h2').text()).toBe('Flower 5');
		expect(wrapper.get('img').attributes('src')).toBe('data:image/png;base64,AAA');
		expect(wrapper.get('.loadingEffect').text()).toBe('processing');
		expect(wrapper.find('.description-caption').exists()).toBe(false);
	});

	test('shows the description when it arrives, and uses it as the text of the image', async () => {
		show();
		describeIt('a red flower with many petals');
		await wrapper.vm.$nextTick();

		expect(wrapper.find('.loadingEffect').exists()).toBe(false);
		expect(wrapper.get('.description-caption').text()).toBe('a red flower with many petals');
		expect(wrapper.get('img').attributes('alt')).toBe('a red flower with many petals');
	});

	test('Ok. closes it', async () => {
		show();
		await wrapper.vm.$nextTick();

		await wrapper.get('button.safe-button').trigger('click');

		expect(wrapper.get('button.safe-button').text()).toBe('Ok.');
		expect(dialog().open).toBe(false);
	});

	test('the × closes it', async () => {
		show();
		await wrapper.vm.$nextTick();

		await wrapper.get('.fe-modal-close').trigger('click');

		expect(dialog().open).toBe(false);
	});

	test.each([
		['Ok.', (w) => w.get('button.safe-button').trigger('click')],
		['the ×', (w) => w.get('.fe-modal-close').trigger('click')],
		['Esc', async (w) => { w.get('dialog').element.dispatchEvent(new Event('close')); }],
	])('is ready for the next flower after %s: processing again, not the last description', async (_, closeIt) => {
		show();
		describeIt('the first flower');
		await wrapper.vm.$nextTick();
		expect(wrapper.get('.description-caption').text()).toBe('the first flower');

		await closeIt(wrapper);
		await wrapper.vm.$nextTick();
		show({ FlowerID: 6 });
		await wrapper.vm.$nextTick();

		expect(wrapper.get('h2').text()).toBe('Flower 6');
		expect(wrapper.get('.loadingEffect').text()).toBe('processing');
		expect(wrapper.find('.description-caption').exists()).toBe(false);
		expect(wrapper.get('img').attributes('alt')).toBe('processing');
	});

	test('listens to the flower and to the description while it is there, and to none when it is unmounted', () => {
		expect(emitter.all.get('showDescriptionModal')).toHaveLength(1);
		expect(emitter.all.get('updateDesc')).toHaveLength(1);

		wrapper.unmount();
		wrapper = undefined;

		expect(emitter.all.get('showDescriptionModal') ?? []).toHaveLength(0);
		expect(emitter.all.get('updateDesc') ?? []).toHaveLength(0);
	});

	test('leaves the listeners of others on its events when it is unmounted', () => {
		const others = ['showDescriptionModal', 'updateDesc'].map((event) => {
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
