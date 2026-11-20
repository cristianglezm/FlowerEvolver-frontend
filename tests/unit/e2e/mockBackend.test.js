import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as flowerApiClient from '../../../src/services/flowerApiClient';
import { FakeBackend } from '../../e2e/mockBackend';

// The e2e specs of the tabs that need a server cannot run where the suite is written, so what they stand on is
// tried here: the real API client of the app talks to the fake server, through fetch, and what the client asks
// has to be what the fake answers. A change of the client that the fake does not follow fails here, and not in a
// browser.
describe('FakeBackend, as the API client of the app sees it', () => {
	let backend;

	beforeEach(() => {
		backend = new FakeBackend().seed(5);
		vi.stubGlobal('fetch', async (url, options = {}) => {
			const answer = backend.respond({
				method: options.method,
				url,
				body: options.body === undefined ? undefined : JSON.parse(options.body),
			});
			if(answer === null){
				throw new TypeError('Failed to fetch');
			}
			const text = typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body);
			return new Response(text, { status: answer.status });
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('the address of the API is a path that the specs can match', () => {
		expect(flowerApiClient.API).toMatch(/\/api\/$/);
	});

	test('counts the flowers, and lists them newest first, a page at a time', async () => {
		expect(await flowerApiClient.getFlowersCount()).toBe(5);

		const first = await flowerApiClient.getFlowers({ limit: 3, offset: 0 });
		expect(first.map((f) => f.id)).toEqual([5, 4, 3]);
		const second = await flowerApiClient.getFlowers({ limit: 3, offset: 3 });
		expect(second.map((f) => f.id)).toEqual([2, 1]);
		expect(first[0]).toEqual({ id: 5, genome: '5.json', image: '5.png' });
	});

	test('makes a flower, which is the newest', async () => {
		const flower = await flowerApiClient.createFlower();

		expect(flower.id).toBe(6);
		expect(await flowerApiClient.getFlowersCount()).toBe(6);
		expect((await flowerApiClient.getFlowers({ limit: 1, offset: 0 }))[0].id).toBe(6);
	});

	test('a genome that is shared does not make a flower', async () => {
		await flowerApiClient.shareFlower('{"Flower":{}}');

		expect(await flowerApiClient.getFlowersCount()).toBe(5);
		expect(backend.sent('POST', 'flowers')).toHaveLength(1);
	});

	test('reproduces two flowers, and lists the children of the pair, ordered, and of one flower', async () => {
		const child = await flowerApiClient.reproduceRemote(5, 4);
		await flowerApiClient.reproduceRemote(4, 5);
		await flowerApiClient.reproduceRemote(2, 3);

		expect(backend.sent('POST', 'descendants')[0].body).toEqual({ father: 5, mother: 4 });
		expect(await flowerApiClient.getDescendantsCount(5, 4)).toBe(1);
		expect((await flowerApiClient.getDescendants(5, 4, { limit: 10, offset: 0 })).map((f) => f.id)).toEqual([child.id]);
		// one flower: as father or as mother
		expect(await flowerApiClient.getDescendantsCount(5)).toBe(2);
		expect((await flowerApiClient.getDescendants(5, undefined, { limit: 10, offset: 0 })).map((f) => f.id)).toEqual([7, 6]);
	});

	test('mutates a flower, and lists the mutations of that flower only', async () => {
		const mutation = await flowerApiClient.mutateRemote(2);
		await flowerApiClient.mutateRemote(3);

		expect(backend.sent('POST', 'mutations')[0].body).toEqual({ original: 2 });
		expect(await flowerApiClient.getMutationsCount(2)).toBe(1);
		expect((await flowerApiClient.getMutations(2, { limit: 10, offset: 0 })).map((f) => f.id)).toEqual([mutation.id]);
		expect(await flowerApiClient.getMutationsCount(1)).toBe(0);
	});

	test('can be told about what exists before the app starts', async () => {
		const mutation = backend.addMutation(1);
		const child = backend.addChild(1, 2);

		expect(await flowerApiClient.getMutationsCount(1)).toBe(1);
		expect(await flowerApiClient.getDescendantsCount(1, 2)).toBe(1);
		expect([mutation.id, child.id]).toEqual([6, 7]);
	});

	test('cannot be reached when it is offline, as fetch says it', async () => {
		backend.offline = true;

		const failure = await flowerApiClient.getFlowersCount().catch((e) => e);

		expect(failure).toBeInstanceOf(TypeError);
		expect(flowerApiClient.describeError(failure, 'server offline')).toBe('server offline');
		expect(backend.requests).toHaveLength(0);
	});

	test('does not know a path that the API does not have', () => {
		expect(backend.respond({ method: 'GET', url: 'http://x/api/ancestors/1?count=1' })).toEqual({ status: 404, body: 'not found' });
	});
});
