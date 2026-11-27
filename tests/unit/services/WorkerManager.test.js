import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import mitt from 'mitt';
import WorkerManager from '../../../src/services/WorkerManager';

const fakeWorker = () => ({ postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null });

describe('WorkerManager', () => {
    let channel, wm;
    beforeEach(() => {
        channel = mitt();
        wm = new WorkerManager(channel);
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('what a worker says reaches the callback of its name only', () => {
        const a = fakeWorker(), b = fakeWorker();
        wm.addWorker('a', a);
        wm.addWorker('b', b);
        const onA = vi.fn(), onB = vi.fn();
        wm.onResponse('a', onA);
        wm.onResponse('b', onB);
        a.onmessage({ data: { n: 1 } });
        expect(onA).toHaveBeenCalledWith({ n: 1 });
        expect(onB).not.toHaveBeenCalled();
    });

    test('an error of a worker says what failed and where', () => {
        const w = fakeWorker();
        wm.addWorker('a', w);
        const onError = vi.fn();
        wm.onError('a', onError);
        w.onerror({ message: 'boom', filename: 'x.js', lineno: 7 });
        expect(onError).toHaveBeenCalledWith('boom at x.js at line 7');
    });

    test('a request goes to the worker that is named, and an unknown name is reported', () => {
        const w = fakeWorker();
        wm.addWorker('a', w);
        wm.sendRequest('a', { go: true });
        expect(w.postMessage).toHaveBeenCalledWith({ go: true });
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        wm.sendRequest('missing', {});
        expect(error).toHaveBeenCalledWith('Worker missing not found');
    });

    test('deleting a worker ends it and forgets it', () => {
        const w = fakeWorker();
        wm.addWorker('a', w);
        expect(wm.has('a')).toBe(true);
        wm.deleteWorker('a');
        expect(w.terminate).toHaveBeenCalledTimes(1);
        expect(wm.has('a')).toBe(false);
    });

    test('deleting a worker that is not there does nothing', () => {
        expect(() => wm.deleteWorker('missing')).not.toThrow();
    });

    test('the callbacks given to a worker are not called after it is deleted', () => {
        const w = fakeWorker();
        wm.addWorker('a', w);
        const onResponse = vi.fn(), onError = vi.fn();
        wm.onResponse('a', onResponse);
        wm.onError('a', onError);
        wm.deleteWorker('a');
        channel.emit('a#onmessage', 1);
        channel.emit('a#onerror', 'x');
        expect(onResponse).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
    });

    test('deleting a worker leaves the listeners that others put on the same channel', () => {
        const w = fakeWorker();
        wm.addWorker('a', w);
        const own = vi.fn(), foreign = vi.fn(), foreignError = vi.fn();
        wm.onResponse('a', own);
        channel.on('a#onmessage', foreign);
        channel.on('a#onerror', foreignError);
        wm.deleteWorker('a');
        channel.emit('a#onmessage', 1);
        channel.emit('a#onerror', 'x');
        expect(own).not.toHaveBeenCalled();
        expect(foreign).toHaveBeenCalledWith(1);
        expect(foreignError).toHaveBeenCalledWith('x');
    });

    test('deleting a worker leaves the callbacks of the others that the manager has', () => {
        const a = fakeWorker(), b = fakeWorker();
        wm.addWorker('a', a);
        wm.addWorker('b', b);
        const onB = vi.fn();
        wm.onResponse('b', onB);
        wm.deleteWorker('a');
        b.onmessage({ data: 2 });
        expect(onB).toHaveBeenCalledWith(2);
    });

    test('every callback given for a worker is removed with it', () => {
        const w = fakeWorker();
        wm.addWorker('a', w);
        const one = vi.fn(), two = vi.fn();
        wm.onResponse('a', one);
        wm.onResponse('a', two);
        wm.deleteWorker('a');
        channel.emit('a#onmessage', 1);
        expect(one).not.toHaveBeenCalled();
        expect(two).not.toHaveBeenCalled();
    });

    test('a worker added again with the same name starts with no callbacks of the one before', () => {
        wm.addWorker('a', fakeWorker());
        const old = vi.fn();
        wm.onResponse('a', old);
        wm.deleteWorker('a');
        const w2 = fakeWorker();
        wm.addWorker('a', w2);
        const fresh = vi.fn();
        wm.onResponse('a', fresh);
        w2.onmessage({ data: 3 });
        expect(old).not.toHaveBeenCalled();
        expect(fresh).toHaveBeenCalledWith(3);
    });
});
