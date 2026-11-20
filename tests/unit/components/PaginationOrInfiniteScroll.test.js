// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PaginationOrInfiniteScroll from '../../../src/components/PaginationOrInfiniteScroll.vue';

const mountPaginated = (currentPage, totalPages) => {
    return mount(PaginationOrInfiniteScroll, {
        props: { pagination: true, itemsLength: 10, currentPage, totalPages },
        slots: { default: '<p>flowers</p>' }
    });
};
const buttons = (wrapper) => {
    const [prev, next] = wrapper.findAll('button');
    return { prev, next };
};

describe('PaginationOrInfiniteScroll', () => {
    // totalPages is a count and currentPage is an index, so the last page is totalPages - 1.
    test.each([
        { currentPage: 0, totalPages: 1, nextDisabled: true },
        { currentPage: 0, totalPages: 2, nextDisabled: false },
        { currentPage: 1, totalPages: 2, nextDisabled: true },
        { currentPage: 2, totalPages: 3, nextDisabled: true },
        { currentPage: 0, totalPages: 0, nextDisabled: true },
    ])('next is disabled=$nextDisabled on page $currentPage of $totalPages', ({ currentPage, totalPages, nextDisabled }) => {
        const { next } = buttons(mountPaginated(currentPage, totalPages));
        expect(next.element.disabled).toBe(nextDisabled);
    });

    test('prev is disabled only on the first page', () => {
        expect(buttons(mountPaginated(0, 3)).prev.element.disabled).toBe(true);
        expect(buttons(mountPaginated(1, 3)).prev.element.disabled).toBe(false);
    });

    test('emits next-page and prev-page only when the move is possible', async () => {
        const middle = mountPaginated(1, 3);
        await buttons(middle).next.trigger('click');
        await buttons(middle).prev.trigger('click');
        expect(middle.emitted('next-page')).toHaveLength(1);
        expect(middle.emitted('prev-page')).toHaveLength(1);

        const last = mountPaginated(2, 3);
        await buttons(last).next.trigger('click');
        expect(last.emitted('next-page')).toBeUndefined();
    });
});

describe('PaginationOrInfiniteScroll, without pages', () => {
	let wrapper;
	const mountInfinite = (anchor) => {
		wrapper = mount(PaginationOrInfiniteScroll, {
			props: { pagination: false, itemsLength: 10, currentPage: 0, totalPages: 1, ...(anchor ? { anchor } : {}) },
			slots: { default: '<p>flowers</p>' },
			attachTo: document.body,
		});
		return wrapper;
	};
	const scrollToTheBottom = async () => {
		window.dispatchEvent(new Event('scroll'));
		await vi.advanceTimersByTimeAsync(200);
	};
	const backToTop = () => wrapper.find('[data-testid="back-to-top"]');

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		window.scrollTo = vi.fn();
		Element.prototype.scrollIntoView = vi.fn();
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
		document.body.innerHTML = '';
		vi.useRealTimers();
	});

	test('has no arrows, and no button to go back until the bottom is reached', () => {
		mountInfinite();

		expect(wrapper.text()).toBe('flowers');
		expect(wrapper.findAll('button')).toHaveLength(0);
	});

	test('asks for more and shows the button to go back when the bottom is reached', async () => {
		mountInfinite();

		await scrollToTheBottom();

		expect(wrapper.emitted('update-page')).toHaveLength(1);
		expect(backToTop().exists()).toBe(true);
		expect(backToTop().text()).toBe('back to top');
	});

	test('waits for the scrolling to stop before it asks', async () => {
		mountInfinite();

		window.dispatchEvent(new Event('scroll'));
		await vi.advanceTimersByTimeAsync(150);
		window.dispatchEvent(new Event('scroll'));
		await vi.advanceTimersByTimeAsync(150);
		expect(wrapper.emitted('update-page')).toBeUndefined();

		await vi.advanceTimersByTimeAsync(50);
		expect(wrapper.emitted('update-page')).toHaveLength(1);
	});

	test('goes to the top of the page and hides the button when it is clicked', async () => {
		mountInfinite();
		await scrollToTheBottom();
		window.scrollTo.mockClear();

		await backToTop().trigger('click');

		expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'smooth' });
		expect(backToTop().exists()).toBe(false);
	});

	test('goes to its anchor, and not to the top, when it has one', async () => {
		const target = document.createElement('div');
		target.id = 'list-top';
		document.body.appendChild(target);
		mountInfinite('list-top');
		await scrollToTheBottom();
		window.scrollTo.mockClear();

		await backToTop().trigger('click');

		expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
		expect(window.scrollTo).not.toHaveBeenCalled();
		expect(backToTop().exists()).toBe(false);
	});

	test('stops listening to the scrolling when it is unmounted', async () => {
		const added = vi.spyOn(window, 'addEventListener');
		const removed = vi.spyOn(window, 'removeEventListener');
		mountInfinite();
		const handler = added.mock.calls.find(([type]) => type === 'scroll')[1];

		wrapper.unmount();
		wrapper = undefined;

		expect(removed).toHaveBeenCalledWith('scroll', handler);
		added.mockRestore();
		removed.mockRestore();
	});
});
