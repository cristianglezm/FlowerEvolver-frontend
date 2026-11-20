import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as flowerApiClient from '../../../src/services/flowerApiClient';

// the answer of the server: a status and a body, as text (what the network gives)
const answer = (body, status = 200) => ({
	ok: status >= 200 && status < 300,
	status,
	text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

describe('flowerApiClient', () => {
	let fetchMock;
	const lastRequest = () => {
		const [url, options] = fetchMock.mock.calls.at(-1);
		return { url, method: options.method, headers: options.headers, body: options.body };
	};

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('describeError', () => {
		test('returns the offline message when the server did not answer', () => {
			expect(flowerApiClient.describeError(new TypeError('Failed to fetch'), 'offline')).toBe('offline');
		});

		test('returns what the server said when it answered with an error', () => {
			expect(flowerApiClient.describeError(new flowerApiClient.ApiError(500, 'server said no'), 'offline')).toBe('server said no');
		});

		test('returns the body that the server sent when it was json', () => {
			expect(flowerApiClient.describeError(new flowerApiClient.ApiError(400, { error: 'bad genome' }), 'offline')).toEqual({ error: 'bad genome' });
		});

		test('does not take for an answer of the server what only looks like one', () => {
			expect(flowerApiClient.describeError({ response: { data: 'x' } }, 'offline')).toBe('offline');
		});
	});

	describe('ApiError', () => {
		test('is an error with the status and what the server said', () => {
			const error = new flowerApiClient.ApiError(404, 'not found');

			expect(error).toBeInstanceOf(Error);
			expect(error.status).toBe(404);
			expect(error.data).toBe('not found');
			expect(error.message).toBe('not found');
		});

		test('says the status when the server said nothing in words', () => {
			expect(new flowerApiClient.ApiError(502, '').message).toBe('the server answered 502');
			expect(new flowerApiClient.ApiError(400, { error: 'x' }).message).toBe('the server answered 400');
		});
	});

	describe('reads', () => {
		test.each([
			['getFlowersCount', () => flowerApiClient.getFlowersCount(), { count: 5 }, 5, 'flowers?count=1'],
			['getFlowers', () => flowerApiClient.getFlowers({ limit: 10, offset: 0 }), { flowers: [{ id: 1 }] }, [{ id: 1 }], 'flowers?limit=10&offset=0'],
			['getMutationsCount without an original queries the unscoped endpoint', () => flowerApiClient.getMutationsCount(), { count: 3 }, 3, 'mutations?count=1'],
			['getMutationsCount with an original scopes the query', () => flowerApiClient.getMutationsCount(7), { count: 2 }, 2, 'mutations/7?count=1'],
			['getMutations', () => flowerApiClient.getMutations(7, { limit: 5, offset: 0 }), [{ id: 1 }], [{ id: 1 }], 'mutations/7?limit=5&offset=0'],
			['getDescendantsCount with just a father', () => flowerApiClient.getDescendantsCount(1), { count: 1 }, 1, 'descendants/1?count=1'],
			['getDescendantsCount with a father and mother', () => flowerApiClient.getDescendantsCount(1, 2), { count: 1 }, 1, 'descendants/1/2?count=1'],
			['getDescendants with just a father', () => flowerApiClient.getDescendants(1, undefined, { limit: 5, offset: 0 }), [{ id: 1 }], [{ id: 1 }], 'descendants/1?limit=5&offset=0'],
			['getDescendants with a father and mother', () => flowerApiClient.getDescendants(1, 2, { limit: 5, offset: 0 }), [{ id: 1 }], [{ id: 1 }], 'descendants/1/2?limit=5&offset=0'],
		])('%s', async (_, call, body, result, path) => {
			fetchMock.mockResolvedValue(answer(body));

			await expect(call()).resolves.toEqual(result);

			expect(fetchMock).toHaveBeenCalledTimes(1);
			const request = lastRequest();
			expect(request.url).toBe(flowerApiClient.API + path);
			expect(request.method).toBe('GET');
			expect(request.body).toBeUndefined();
			expect(request.headers).toBeUndefined();
		});

		test('null is no original and no mother, as undefined is', async () => {
			fetchMock.mockResolvedValue(answer({ count: 0 }));

			await flowerApiClient.getMutationsCount(null);
			expect(lastRequest().url).toBe(flowerApiClient.API + 'mutations?count=1');
			await flowerApiClient.getDescendantsCount(3, null);
			expect(lastRequest().url).toBe(flowerApiClient.API + 'descendants/3?count=1');
			await flowerApiClient.getDescendants(3, null, { limit: 1, offset: 0 });
			expect(lastRequest().url).toBe(flowerApiClient.API + 'descendants/3?limit=1&offset=0');
		});
	});

	describe('writes', () => {
		test('createFlower posts an empty object and returns the created flower', async () => {
			fetchMock.mockResolvedValue(answer({ id: 1, genome: 'g', image: 'i' }));

			await expect(flowerApiClient.createFlower()).resolves.toEqual({ id: 1, genome: 'g', image: 'i' });

			expect(lastRequest()).toEqual({ url: flowerApiClient.API + 'flowers', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
		});

		test('shareFlower posts the genome as it is, not as the text of a json string', async () => {
			fetchMock.mockResolvedValue(answer(''));

			await expect(flowerApiClient.shareFlower('{"Flower":{}}')).resolves.toBeUndefined();

			expect(lastRequest()).toEqual({ url: flowerApiClient.API + 'flowers', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"Flower":{}}' });
		});

		test('reproduceRemote posts father and mother and returns the child', async () => {
			fetchMock.mockResolvedValue(answer({ id: 3 }));

			await expect(flowerApiClient.reproduceRemote(1, 2)).resolves.toEqual({ id: 3 });

			const request = lastRequest();
			expect(request.url).toBe(flowerApiClient.API + 'descendants');
			expect(request.method).toBe('POST');
			expect(request.headers).toEqual({ 'Content-Type': 'application/json' });
			expect(JSON.parse(request.body)).toEqual({ father: 1, mother: 2 });
		});

		test('mutateRemote posts the original id and returns the mutation', async () => {
			fetchMock.mockResolvedValue(answer({ id: 4 }));

			await expect(flowerApiClient.mutateRemote(1)).resolves.toEqual({ id: 4 });

			const request = lastRequest();
			expect(request.url).toBe(flowerApiClient.API + 'mutations');
			expect(request.method).toBe('POST');
			expect(JSON.parse(request.body)).toEqual({ original: 1 });
		});
	});

	describe('when it goes wrong', () => {
		test('a server that answers with an error throws what it said, with its status', async () => {
			fetchMock.mockResolvedValue(answer('not enough flowers', 400));

			const error = await flowerApiClient.mutateRemote(1).catch((e) => e);

			expect(error).toBeInstanceOf(flowerApiClient.ApiError);
			expect(error.status).toBe(400);
			expect(error.data).toBe('not enough flowers');
		});

		test('an error that is json is thrown parsed', async () => {
			fetchMock.mockResolvedValue(answer({ error: 'rate limit' }, 429));

			const error = await flowerApiClient.getFlowersCount().catch((e) => e);

			expect(error.status).toBe(429);
			expect(error.data).toEqual({ error: 'rate limit' });
		});

		test.each([301, 404, 500, 503])('a status of %i is an error', async (status) => {
			fetchMock.mockResolvedValue(answer('no', status));

			await expect(flowerApiClient.getFlowers({ limit: 1, offset: 0 })).rejects.toBeInstanceOf(flowerApiClient.ApiError);
		});

		test('a server that cannot be reached throws what fetch threw, and it is not an answer of the server', async () => {
			const failure = new TypeError('Failed to fetch');
			fetchMock.mockRejectedValue(failure);

			const error = await flowerApiClient.getFlowersCount().catch((e) => e);

			expect(error).toBe(failure);
			expect(error).not.toBeInstanceOf(flowerApiClient.ApiError);
			expect(flowerApiClient.describeError(error, 'server offline')).toBe('server offline');
		});

		test('an answer that is not json is the text that it is', async () => {
			fetchMock.mockResolvedValue(answer('<html>bad gateway</html>', 502));

			const error = await flowerApiClient.createFlower().catch((e) => e);

			expect(error.data).toBe('<html>bad gateway</html>');
		});
	});
});
