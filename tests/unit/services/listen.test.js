import { describe, test, expect, vi } from 'vitest';
import mitt from 'mitt';
import { listen } from '../../../src/services/listen';

describe('listen', () => {
    test('calls the handler when the event comes, and stops when it is told to', () => {
        const channel = mitt();
        const handler = vi.fn();
        const stop = listen(channel, 'x', handler);

        channel.emit('x', 1);
        stop();
        channel.emit('x', 2);

        expect(handler).toHaveBeenCalledExactlyOnceWith(1);
    });

    test('stopping takes away its handler and no other of the same event', () => {
        const channel = mitt();
        const mine = vi.fn(), theirs = vi.fn();
        channel.on('x', theirs);
        const stop = listen(channel, 'x', mine);

        stop();
        channel.emit('x', 1);

        expect(mine).not.toHaveBeenCalled();
        expect(theirs).toHaveBeenCalledExactlyOnceWith(1);
    });

    test('the same function listening twice is stopped one at a time', () => {
        const channel = mitt();
        const handler = vi.fn();
        const stopFirst = listen(channel, 'x', handler);
        listen(channel, 'x', handler);

        stopFirst();
        channel.emit('x');

        expect(handler).toHaveBeenCalledTimes(1);
    });
});
