// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { reactive, ref, defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { usePageInAddress } from '../../../src/composables/usePageInAddress';

// The list is a stand-in with the same shape as what usePaginatedList returns, what is checked is what the helper
// does to the address and to the list, with a real router.
describe('usePageInAddress', () => {
	let router;
	let paged;
	let arrows;
	let wrapper;

	const makePaged = (page = 0, totalPages = 5) => {
		const state = reactive({ page, totalPages });
		const move = async (to) => { state.page = to; };
		return {
			state,
			isPaginated: ref(true),
			nextPage: vi.fn(async () => move(state.page + 1)),
			prevPage: vi.fn(async () => move(state.page - 1)),
			goToPage: vi.fn(async (to) => move(to)),
		};
	};
	const mountAt = async (path, pagedList = paged) => {
		await router.push(path);
		wrapper = mount(defineComponent({
			setup(){
				arrows = usePageInAddress(pagedList);
				return () => h('div');
			},
		}), { global: { plugins: [router] } });
		await flushPromises();
	};
	const path = () => router.currentRoute.value.fullPath;

	beforeEach(() => {
		const page = { template: '<div />' };
		router = createRouter({
			history: createMemoryHistory(),
			routes: [{ path: '/List', component: page }, { path: '/Other', component: page }, { path: '/List/:id', component: page }],
		});
		paged = makePaged();
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
	});

	test('the arrows move the list and put the page in the address, and the first page has none', async () => {
		await mountAt('/List');

		await arrows.nextPage();
		await flushPromises();
		expect(paged.state.page).toBe(1);
		expect(path()).toBe('/List?page=1');

		await arrows.nextPage();
		await flushPromises();
		expect(path()).toBe('/List?page=2');

		await arrows.prevPage();
		await arrows.prevPage();
		await flushPromises();
		expect(paged.state.page).toBe(0);
		expect(path()).toBe('/List');
	});

	test('what is given as the arrows moves the list in the way the list does', async () => {
		await mountAt('/List');

		await arrows.nextPage();
		await arrows.prevPage();

		expect(paged.nextPage).toHaveBeenCalledTimes(1);
		expect(paged.prevPage).toHaveBeenCalledTimes(1);
	});

	test('each page of the arrows is a place in the history, the back button goes to the page before', async () => {
		await mountAt('/List');
		await arrows.nextPage();
		await flushPromises();
		await arrows.nextPage();
		await flushPromises();

		router.back();
		await vi.waitFor(() => expect(paged.state.page).toBe(1));
		expect(path()).toBe('/List?page=1');

		router.back();
		await vi.waitFor(() => expect(paged.state.page).toBe(0));
		expect(path()).toBe('/List');

		router.forward();
		await vi.waitFor(() => expect(paged.state.page).toBe(1));
		// the page is read in place, once for each change of the address, and the arrows did not read it again
		expect(paged.goToPage.mock.calls).toEqual([[1], [0], [1]]);
	});

	test('a page that the list moves to by itself replaces the address, it is not a place to go back to', async () => {
		paged = makePaged(3);
		await mountAt('/List?page=3');
		const push = vi.spyOn(router, 'push');
		const replace = vi.spyOn(router, 'replace');

		paged.state.page = 0;
		await flushPromises();

		expect(path()).toBe('/List');
		expect(replace).toHaveBeenCalledTimes(1);
		expect(push).not.toHaveBeenCalled();
	});

	test('the page the list starts at is in the address already: nothing is done', async () => {
		paged = makePaged(2);
		await mountAt('/List?page=2');
		const push = vi.spyOn(router, 'push');
		const replace = vi.spyOn(router, 'replace');

		paged.state.page = 2;
		await flushPromises();

		expect(push).not.toHaveBeenCalled();
		expect(replace).not.toHaveBeenCalled();
		expect(paged.goToPage).not.toHaveBeenCalled();
	});

	test('the rest of the address stays: the other parameters, the query and the hash', async () => {
		await mountAt('/List?sort=old&page=0#top');

		await arrows.nextPage();
		await flushPromises();
		expect(path()).toBe('/List?sort=old&page=1#top');

		await arrows.prevPage();
		await flushPromises();
		expect(path()).toBe('/List?sort=old#top');
	});

	test('the address changes to a page: that page is shown, the nearest one that exists is the list\'s to choose', async () => {
		await mountAt('/List');

		await router.push('/List?page=4');
		await flushPromises();

		expect(paged.goToPage).toHaveBeenCalledExactlyOnceWith(4);
		expect(paged.state.page).toBe(4);
	});

	test('a page that is not a number, or is negative, is the first one', async () => {
		paged = makePaged(2);
		await mountAt('/List?page=2');

		await router.push('/List?page=abc');
		await flushPromises();
		expect(paged.goToPage).toHaveBeenLastCalledWith(0);

		await router.push('/List?page=-3');
		await flushPromises();
		expect(paged.goToPage).toHaveBeenCalledTimes(1);
	});

	test('an address that has the page that is shown does not read it again', async () => {
		paged = makePaged(2);
		await mountAt('/List?page=2');

		await router.push('/List?page=2&other=1');
		await flushPromises();

		expect(paged.goToPage).not.toHaveBeenCalled();
	});

	test('a link to another view does not read a page, the view is going away', async () => {
		paged = makePaged(2);
		await mountAt('/List?page=2');

		await router.push('/Other');
		await flushPromises();
		await router.push('/Other?page=1');
		await flushPromises();

		expect(paged.goToPage).not.toHaveBeenCalled();
		expect(path()).toBe('/Other?page=1');
	});

	test('a view of the same place that is another one, by its parameters, is another view', async () => {
		await mountAt('/List/1');
		const push = vi.spyOn(router, 'push');

		await router.push('/List/2?page=3');
		await flushPromises();

		expect(paged.goToPage).not.toHaveBeenCalled();
		expect(push).toHaveBeenCalledTimes(1);
	});

	test('a page that arrives when the address is of another view is not put in that address', async () => {
		await mountAt('/List');
		await router.push('/Other');
		await flushPromises();
		const push = vi.spyOn(router, 'push');
		const replace = vi.spyOn(router, 'replace');

		// the page that was being read when the view was left
		paged.state.page = 2;
		await flushPromises();

		expect(path()).toBe('/Other');
		expect(push).not.toHaveBeenCalled();
		expect(replace).not.toHaveBeenCalled();
	});

	test('infinite scroll has no pages: the address is not touched and is not read', async () => {
		paged.isPaginated.value = false;
		await mountAt('/List');

		await arrows.nextPage();
		paged.state.page = 3;
		await flushPromises();
		expect(path()).toBe('/List');

		await router.push('/List?page=2');
		await flushPromises();
		expect(paged.goToPage).not.toHaveBeenCalled();
	});

	test('a page that fails to load does not leave the arrows as the cause of the next change', async () => {
		await mountAt('/List');
		paged.nextPage.mockRejectedValueOnce(new Error('cannot read'));

		await expect(arrows.nextPage()).rejects.toThrow('cannot read');

		const push = vi.spyOn(router, 'push');
		const replace = vi.spyOn(router, 'replace');
		paged.state.page = 2;
		await flushPromises();
		expect(push).not.toHaveBeenCalled();
		expect(replace).toHaveBeenCalledTimes(1);
	});
});
