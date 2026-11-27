import { describe, test, expect, vi, afterEach } from 'vitest';
import { isGPUAvailable, ModelCache, dataURLToBlob } from '../../../src/services/AIUtils';

describe('AIUtils', () => {
    afterEach(() => vi.unstubAllGlobals());

    test('the GPU is available when the browser has one to give', () => {
        vi.stubGlobal('navigator', { gpu: {} });
        expect(isGPUAvailable()).toBe(true);
        vi.stubGlobal('navigator', {});
        expect(isGPUAvailable()).toBe(false);
    });

    test('a data url is a blob with its type and its bytes', async () => {
        const blob = dataURLToBlob('data:image/png;base64,' + btoa('abc'));
        expect(blob.type).toBe('image/png');
        expect(blob.size).toBe(3);
        expect(await blob.text()).toBe('abc');
    });

    test('the model cache matches and puts in the cache it is named for', async () => {
        const cache = { match: vi.fn().mockResolvedValue('hit'), put: vi.fn().mockResolvedValue(undefined) };
        const open = vi.fn().mockResolvedValue(cache);
        vi.stubGlobal('caches', { open });
        const mc = new ModelCache('mine');
        expect(await mc.match('r')).toBe('hit');
        await mc.put('r', 'resp');
        expect(open).toHaveBeenCalledWith('mine');
        expect(cache.put).toHaveBeenCalledWith('r', 'resp');
        expect(new ModelCache().cacheName).toBe('transformers-cache');
    });
});
