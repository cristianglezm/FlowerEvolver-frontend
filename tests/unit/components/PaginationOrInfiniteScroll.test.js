// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
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
