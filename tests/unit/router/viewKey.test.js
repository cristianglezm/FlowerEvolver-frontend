import { describe, test, expect } from 'vitest';
import { viewKeyOf } from '../../../src/router/viewKey';

const route = (path, query = {}, hash = '') => ({ path, query, hash });

describe('viewKeyOf', () => {
	test('is the same for every page of a list, the view stays when its page changes', () => {
		const key = viewKeyOf(route('/Local'));

		expect(viewKeyOf(route('/Local', { page: '1' }))).toBe(key);
		expect(viewKeyOf(route('/Local', { page: '12' }))).toBe(key);
	});

	test('is another for another view, or another thing in the same one', () => {
		const key = viewKeyOf(route('/Mutations/local/1'));

		expect(viewKeyOf(route('/Mutations/local/2'))).not.toBe(key);
		expect(viewKeyOf(route('/Mutations/remote/1'))).not.toBe(key);
		expect(viewKeyOf(route('/Local'))).not.toBe(viewKeyOf(route('/Favourites')));
	});

	test('is another when what is not the page of the address is another', () => {
		expect(viewKeyOf(route('/Local', { a: '1' }))).not.toBe(viewKeyOf(route('/Local', { a: '2' })));
		expect(viewKeyOf(route('/Local', { a: '1', page: '3' }))).toBe(viewKeyOf(route('/Local', { a: '1' })));
		expect(viewKeyOf(route('/Local', {}, '#a'))).not.toBe(viewKeyOf(route('/Local', {}, '#b')));
	});

	test('does not change the route it is given', () => {
		const given = route('/Local', { page: '1' });

		viewKeyOf(given);

		expect(given.query).toEqual({ page: '1' });
	});
});
