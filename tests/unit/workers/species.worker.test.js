import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { getFlowerEvolver } from '../../../src/services/flowerEvolver';
import { SpeciesClient } from '../../../src/services/SpeciesClient';

// The worker talks to `self`. Give it a scope of our own and a Worker that is wired to it,
// with structuredClone on both ways like postMessage does.
const scope = {};
const loopbackWorker = () => {
    const worker = {
        onmessage: null,
        onerror: null,
        postMessage: (message) => scope.onmessage({ data: structuredClone(message) }),
    };
    scope.postMessage = (reply) => {
        queueMicrotask(() => worker.onmessage({ data: structuredClone(reply) }));
    };
    return worker;
};
// the raw replies of the worker to some messages, without a client in between
const rawReplies = async (...messages) => {
    const loopback = scope.postMessage;
    const replies = [];
    scope.postMessage = (reply) => replies.push(reply);
    messages.forEach((message) => scope.onmessage({ data: message }));
    await vi.waitFor(() => expect(replies).toHaveLength(messages.length));
    scope.postMessage = loopback;
    return replies;
};
const rawReply = async (message) => (await rawReplies(message))[0];

describe('species.worker', { timeout: 30000 }, () => {
    let client;
    let fe;

    beforeAll(async () => {
        vi.stubGlobal('self', scope);
        await import('../../../src/workers/species.worker.js');
        // the worker and the test share the module, so this is the FEService the worker uses
        fe = await getFlowerEvolver();
        fe.setParams(new FEParams(32, 3, 6.0, 1.0));
    });

    beforeEach(() => {
        client = SpeciesClient.fromWorker(loopbackWorker());
    });

    afterEach(() => {
        fe.loadSOM('');
    });

    test('answers a SpeciesClient end to end, wasm included', async () => {
        const genome = (await fe.makeFlower()).genome;

        const model = await client.getModel();
        const { match, fp } = await client.classify(genome);

        expect(model.custom).toBe(false);
        expect(match.distance).toBeGreaterThan(0);
        expect(fp).toBe(model.fp);
    });

    test('swaps the classifier for the length of a session and puts the main one back', async () => {
        const genomes = [(await fe.makeFlower()).genome, (await fe.makeFlower()).genome];
        const main = await client.getModel();
        const subMap = JSON.parse(main.json);
        subMap.som.weights[0] += 0.5;

        const inSession = await client.session(async (run) => {
            await run.loadSOM(JSON.stringify(subMap));
            const { matches, fp } = await run.classifyBatch(genomes);
            await run.loadSOM(main.custom ? main.json : '');
            return { matches, fp };
        });

        expect(inSession.matches).toHaveLength(2);
        expect(inSession.fp).toBe(SpeciesClient.fingerprint(JSON.stringify(subMap)));
        expect(await client.getModel()).toEqual(main);
    });

    test('gives an error of the FEService to the caller as an error', async () => {
        await expect(client.evaluateFeatures([null])).rejects.toThrow(Error);
    });

    describe('only runs the methods it lists', () => {
        test.each(['makeFlower', 'init', 'constructor', '__proto__', 'toString', ''])('refuses %j', async (method) => {
            const reply = await rawReply({ jobType: 'call', id: 5, method, args: [] });
            expect(reply).toEqual({ jobType: 'error', id: 5, error: `unknown method ${method}` });
        });

        test('and is still working afterwards', async () => {
            await rawReply({ jobType: 'call', id: 1, method: 'makeFlower', args: [] });
            expect((await client.getModel()).json).toBe(fe.getTrainedSOM());
        });
    });

    test('ignores a message that is not a call', async () => {
        scope.postMessage = vi.fn();
        await scope.onmessage({ data: { jobType: 'something else', id: 1, method: 'getSOM', args: [] } });
        await scope.onmessage({ data: {} });
        expect(scope.postMessage).not.toHaveBeenCalled();
    });

    test('answers each call with the id it came with, also when they overlap', async () => {
        const replies = await rawReplies(
            { jobType: 'call', id: 41, method: 'getTrainedSOM', args: [] },
            { jobType: 'call', id: 42, method: 'getSOM', args: [] },
        );
        const byId = Object.fromEntries(replies.map((reply) => [reply.id, reply]));
        expect(byId[41]).toEqual({ jobType: 'result', id: 41, value: fe.getTrainedSOM() });
        expect(byId[42]).toEqual({ jobType: 'result', id: 42, value: '' });
    });

    describe('SpeciesClient.fromWorker', () => {
        test('rejects the calls that are waiting when the worker fails', async () => {
            const silent = { onmessage: null, onerror: null, postMessage: vi.fn() };
            const dead = SpeciesClient.fromWorker(silent);

            const waiting = dead.getModel();
            await vi.waitFor(() => expect(silent.postMessage).toHaveBeenCalled());
            silent.onerror({ message: 'wasm failed to load' });

            await expect(waiting).rejects.toThrow('wasm failed to load');
        });

        test('ignores a reply it was not waiting for', async () => {
            const worker = loopbackWorker();
            const own = SpeciesClient.fromWorker(worker);
            worker.onmessage({ data: { jobType: 'result', id: 999, value: 'late' } });
            expect((await own.getModel()).custom).toBe(false);
        });
    });
});
