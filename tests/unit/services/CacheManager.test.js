import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../../../src/services/CacheManager';

const req = (url) => ({ url });
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

// A cache that holds the requests it is given; `keysDelay` makes reading them take a while,
// as the browser does with a big cache.
const makeCaches = (urls, { keysDelay = 0, openDelay = 0 } = {}) => {
    const store = urls.map(req);
    const delays = [].concat(keysDelay);          // one per read; the last one repeats
    const cache = {
        keys: vi.fn(async () => { const snapshot = [...store]; await tick(delays.length > 1 ? delays.shift() : delays[0]); return snapshot; }),
        delete: vi.fn(async (r) => {
            const i = store.indexOf(r);
            if(i >= 0){ store.splice(i, 1); }
            return i >= 0;
        }),
    };
    const open = vi.fn(async () => { await tick(openDelay); return cache; });
    return { open, cache, store };
};

describe('CacheManager', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    test('the hosts are the origins of what is cached, with the files of each', async () => {
        vi.stubGlobal('caches', makeCaches([
            'https://hf.co/m/a.onnx', 'https://hf.co/m/b.json', 'https://cdn.x/c.wasm', 'https://hf.co/m/a.onnx',
        ]));
        const cm = new CacheManager('c');
        await cm.initCache();
        expect(cm.size()).toBe(2);
        expect(cm.cacheHosts.get('https://hf.co')).toEqual(['a.onnx', 'b.json']);
        expect(cm.cacheHosts.get('https://cdn.x')).toEqual(['c.wasm']);
    });

    test('whoever awaits initCache finds the hosts, also when it asks while the cache is being read', async () => {
        vi.stubGlobal('caches', makeCaches(['https://hf.co/m/a.onnx'], { keysDelay: 20 }));
        const cm = new CacheManager('c');            // starts reading
        await tick(5);                               // the cache is open, its keys are not read yet
        await cm.initCache();                        // the component of the options asks now
        expect(cm.size()).toBe(1);
        expect(cm.isInitialized).toBe(true);
    });

    test('the cache is read once however many ask', async () => {
        const c = makeCaches(['https://hf.co/m/a.onnx'], { keysDelay: 10 });
        vi.stubGlobal('caches', c);
        const cm = new CacheManager('c');
        await Promise.all([cm.initCache(), cm.initCache(), cm.initCache()]);
        expect(c.cache.keys).toHaveBeenCalledTimes(1);
        expect(cm.cacheHosts.get('https://hf.co')).toEqual(['a.onnx']);
    });

    test('a cache that cannot be opened is reported and can be asked again', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const failing = { open: vi.fn().mockRejectedValue(new Error('denied')) };
        vi.stubGlobal('caches', failing);
        const cm = new CacheManager('c');
        await cm.initCache();
        expect(error).toHaveBeenCalled();
        expect(cm.isInitialized).toBe(false);
        vi.stubGlobal('caches', makeCaches(['https://hf.co/m/a.onnx']));
        await cm.initCache();
        expect(cm.size()).toBe(1);
        expect(cm.isInitialized).toBe(true);
    });

    test('reload reads what is in the cache now', async () => {
        const c = makeCaches(['https://hf.co/m/a.onnx']);
        vi.stubGlobal('caches', c);
        const cm = new CacheManager('c');
        await cm.initCache();
        c.store.push(req('https://cdn.x/c.wasm'));
        await cm.reload();
        expect(cm.size()).toBe(2);
    });

    test('a reload that comes while the first read is not over ends with what the second read', async () => {
        const c = makeCaches(['https://hf.co/m/a.onnx'], { keysDelay: [50, 5] });
        vi.stubGlobal('caches', c);
        const cm = new CacheManager('c');
        await tick(5);
        c.store.push(req('https://cdn.x/c.wasm'));
        await cm.reload();                           // the second read is over, the first is not
        expect(cm.size()).toBe(2);
        await tick(70);                              // the first one ends now, with what it saw
        expect(cm.size()).toBe(2);
    });

    test('deleting a host deletes its files from the cache and forgets it', async () => {
        const c = makeCaches(['https://hf.co/m/a.onnx', 'https://hf.co/m/b.json', 'https://cdn.x/c.wasm']);
        vi.stubGlobal('caches', c);
        const cm = new CacheManager('c');
        await cm.initCache();
        await cm.deleteHost('https://hf.co');
        expect(c.store.map((r) => r.url)).toEqual(['https://cdn.x/c.wasm']);
        expect(cm.cacheHosts.has('https://hf.co')).toBe(false);
        expect(cm.cacheHosts.has('https://cdn.x')).toBe(true);
    });

    test('deleting files of a host leaves the others, and a host with none left is forgotten', async () => {
        const c = makeCaches(['https://hf.co/m/a.onnx', 'https://hf.co/m/b.json']);
        vi.stubGlobal('caches', c);
        const cm = new CacheManager('c');
        await cm.initCache();
        await cm.deleteFilesFrom('https://hf.co', ['a.onnx']);
        expect(cm.cacheHosts.get('https://hf.co')).toEqual(['b.json']);
        await cm.deleteFilesFrom('https://hf.co', ['b.json']);
        expect(cm.cacheHosts.has('https://hf.co')).toBe(false);
        expect(c.store).toEqual([]);
    });

    test('a file that is not in the cache is said and nothing else is deleted', async () => {
        const c = makeCaches(['https://hf.co/m/a.onnx']);
        vi.stubGlobal('caches', c);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const cm = new CacheManager('c');
        await cm.initCache();
        await cm.deleteFilesFrom('https://hf.co', ['nope.bin']);
        expect(warn).toHaveBeenCalled();
        expect(c.cache.delete).not.toHaveBeenCalled();
        expect(cm.cacheHosts.get('https://hf.co')).toEqual(['a.onnx']);
    });

    test('hasFiles says whether every file of the host is cached', async () => {
        vi.stubGlobal('caches', makeCaches(['https://hf.co/m/a.onnx', 'https://hf.co/m/b.json']));
        const cm = new CacheManager('c');
        await cm.initCache();
        expect(cm.hasFiles('https://hf.co', ['a.onnx', 'b.json'])).toBe(true);
        expect(cm.hasFiles('https://hf.co', ['a.onnx', 'z'])).toBe(false);
        expect(cm.hasFiles('https://other', ['a.onnx'])).toBe(false);
    });
});
