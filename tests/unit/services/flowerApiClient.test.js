import { describe, test, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as flowerApiClient from '../../../src/services/flowerApiClient';

vi.mock('axios', () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
	},
}));

describe('flowerApiClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('mapAxiosError', () => {
		test('returns the offline message when there is no response (server unreachable)', () => {
			expect(flowerApiClient.mapAxiosError({ response: undefined }, 'offline')).toBe('offline');
		});

		test('returns the response body when the server did respond with an error', () => {
			expect(flowerApiClient.mapAxiosError({ response: { data: 'server said no' } }, 'offline')).toBe('server said no');
		});
	});

	describe('reads', () => {
		test('getFlowersCount', async () => {
			axios.get.mockResolvedValue({ data: { count: 5 } });
			await expect(flowerApiClient.getFlowersCount()).resolves.toBe(5);
			expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('flowers?count=1'));
		});

		test('getFlowers', async () => {
			axios.get.mockResolvedValue({ data: { flowers: [{ id: 1 }] } });
			await expect(flowerApiClient.getFlowers({ limit: 10, offset: 0 })).resolves.toEqual([{ id: 1 }]);
			expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('flowers?limit=10&offset=0'));
		});

		test('getMutationsCount without an original queries the unscoped endpoint', async () => {
			axios.get.mockResolvedValue({ data: { count: 3 } });
			await expect(flowerApiClient.getMutationsCount()).resolves.toBe(3);
			expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('mutations?count=1'));
		});

		test('getMutationsCount with an original scopes the query', async () => {
			axios.get.mockResolvedValue({ data: { count: 2 } });
			await expect(flowerApiClient.getMutationsCount(7)).resolves.toBe(2);
			expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('mutations/7?count=1'));
		});

		test('getMutations', async () => {
			axios.get.mockResolvedValue({ data: [{ id: 1 }] });
			await expect(flowerApiClient.getMutations(7, { limit: 5, offset: 0 })).resolves.toEqual([{ id: 1 }]);
			expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('mutations/7?limit=5&offset=0'));
		});

		test('getAncestorsCount with just a father', async () => {
			axios.get.mockResolvedValue({ data: { count: 1 } });
			await expect(flowerApiClient.getAncestorsCount(1)).resolves.toBe(1);
			expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('ancestors/1?count=1'));
		});

		test('getAncestorsCount with a father and mother', async () => {
			axios.get.mockResolvedValue({ data: { count: 1 } });
			await expect(flowerApiClient.getAncestorsCount(1, 2)).resolves.toBe(1);
			expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('ancestors/1/2?count=1'));
		});

		test('getAncestors with just a father', async () => {
			axios.get.mockResolvedValue({ data: [{ id: 1 }] });
			await expect(flowerApiClient.getAncestors(1, undefined, { limit: 5, offset: 0 })).resolves.toEqual([{ id: 1 }]);
			expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('ancestors/1?limit=5&offset=0'));
		});

		test('getAncestors with a father and mother', async () => {
			axios.get.mockResolvedValue({ data: [{ id: 1 }] });
			await expect(flowerApiClient.getAncestors(1, 2, { limit: 5, offset: 0 })).resolves.toEqual([{ id: 1 }]);
			expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('ancestors/1/2?limit=5&offset=0'));
		});
	});

	describe('writes', () => {
		test('createFlower posts and returns the created flower', async () => {
			axios.post.mockResolvedValue({ data: { id: 1, genome: 'g', image: 'i' } });
			await expect(flowerApiClient.createFlower()).resolves.toEqual({ id: 1, genome: 'g', image: 'i' });
			expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('flowers'), {}, expect.any(Object));
		});

		test('shareFlower posts the genome', async () => {
			axios.post.mockResolvedValue({});
			await flowerApiClient.shareFlower('genome-json');
			expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('flowers'), 'genome-json', expect.any(Object));
		});

		test('reproduceRemote posts father/mother and returns the child', async () => {
			axios.post.mockResolvedValue({ data: { id: 3 } });
			await expect(flowerApiClient.reproduceRemote(1, 2)).resolves.toEqual({ id: 3 });
			expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('ancestors'), { father: 1, mother: 2 });
		});

		test('mutateRemote posts the original id and returns the mutation', async () => {
			axios.post.mockResolvedValue({ data: { id: 4 } });
			await expect(flowerApiClient.mutateRemote(1)).resolves.toEqual({ id: 4 });
			expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('mutations'), { original: 1 });
		});
	});
});
