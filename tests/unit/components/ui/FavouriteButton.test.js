// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FavouriteButton from '../../../../src/components/ui/FavouriteButton.vue';

describe('FavouriteButton', () => {
	let wrapper;
	const mountButton = (props = {}, attrs = {}) => {
		wrapper = mount(FavouriteButton, { props, attrs });
		return wrapper;
	};
	// the name of the picture that the heart shows: heart_empty, heart_filling0 to 4, heart_full
	const frame = () => wrapper.get('img').attributes('src').split('/').pop().replace('.png', '');
	const tick = async (ms) => {
		await vi.advanceTimersByTimeAsync(ms);
	};

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		vi.useRealTimers();
	});

	test('is a button with an empty heart when it is not a favourite', () => {
		mountButton({ favourited: false });

		expect(wrapper.element.tagName).toBe('BUTTON');
		expect(wrapper.attributes('type')).toBe('button');
		expect(frame()).toBe('heart_empty');
		expect(wrapper.attributes('aria-pressed')).toBe('false');
	});

	test('has a full heart when it is a favourite from the start', () => {
		mountButton({ favourited: true });

		expect(frame()).toBe('heart_full');
		expect(wrapper.attributes('aria-pressed')).toBe('true');
	});

	test('has an empty heart that is not pressed while it is not known', () => {
		mountButton({ favourited: null });
		expect(frame()).toBe('heart_empty');
		expect(wrapper.attributes('aria-pressed')).toBe('false');

		wrapper.unmount();
		mountButton();
		expect(frame()).toBe('heart_empty');
		expect(wrapper.attributes('aria-pressed')).toBe('false');
	});

	test('shows a heart that was not known as it is, at once and without the animation', async () => {
		mountButton({ favourited: null });

		await wrapper.setProps({ favourited: true });

		expect(frame()).toBe('heart_full');
		await tick(500);
		expect(frame()).toBe('heart_full');
	});

	test('shows a heart that was not known and is not a favourite as empty', async () => {
		mountButton({ favourited: null });

		await wrapper.setProps({ favourited: false });
		await tick(500);

		expect(frame()).toBe('heart_empty');
	});

	test('fills in six frames, 50 ms each, when it becomes a favourite', async () => {
		mountButton({ favourited: false });

		await wrapper.setProps({ favourited: true });
		expect(frame()).toBe('heart_empty');

		const seen = [];
		for(let i = 0; i < 6; i++){
			await tick(50);
			seen.push(frame());
		}
		expect(seen).toEqual(['heart_filling0', 'heart_filling1', 'heart_filling2', 'heart_filling3', 'heart_filling4', 'heart_full']);
		await tick(500);
		expect(frame()).toBe('heart_full');
	});

	test('empties in the same frames the other way when it stops being a favourite', async () => {
		mountButton({ favourited: true });

		await wrapper.setProps({ favourited: false });
		const seen = [];
		for(let i = 0; i < 6; i++){
			await tick(50);
			seen.push(frame());
		}

		expect(seen).toEqual(['heart_filling4', 'heart_filling3', 'heart_filling2', 'heart_filling1', 'heart_filling0', 'heart_empty']);
	});

	test('turns around from the frame that it is at when it changes again in the middle of the animation', async () => {
		mountButton({ favourited: false });
		await wrapper.setProps({ favourited: true });
		await tick(150);
		expect(frame()).toBe('heart_filling2');

		await wrapper.setProps({ favourited: false });
		await tick(50);
		expect(frame()).toBe('heart_filling1');
		await tick(500);
		expect(frame()).toBe('heart_empty');
	});

	test('does not go on after it is unmounted', async () => {
		mountButton({ favourited: false });
		await wrapper.setProps({ favourited: true });
		await tick(50);

		wrapper.unmount();
		wrapper = undefined;

		expect(vi.getTimerCount()).toBe(0);
	});

	test('says toggle when it is clicked, and does not change by itself', async () => {
		mountButton({ favourited: false });

		await wrapper.trigger('click');

		expect(wrapper.emitted('toggle')).toHaveLength(1);
		await tick(500);
		expect(frame()).toBe('heart_empty');
	});

	test('does not say toggle when it is disabled, and is disabled for the browser: it is the attribute', async () => {
		mountButton({ favourited: false, disabled: true });

		await wrapper.trigger('click');

		expect(wrapper.element.disabled).toBe(true);
		expect(wrapper.attributes()).toHaveProperty('disabled');
		expect(wrapper.classes()).not.toContain('disabled');
		expect(wrapper.emitted('toggle')).toBeUndefined();
	});

	test('has the test id that it is given, it is the one of the button', () => {
		mountButton({ favourited: false }, { 'data-testid': 'flower-favourite' });

		expect(wrapper.attributes('data-testid')).toBe('flower-favourite');
	});
});
