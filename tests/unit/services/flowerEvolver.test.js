import { describe, test, expect, afterEach } from 'vitest';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { getFlowerEvolver, keptPetals, _resetFlowerEvolverForTests } from '../../../src/services/flowerEvolver';

describe('flowerEvolver service', () => {
    afterEach(() => {
        _resetFlowerEvolverForTests();
    });

    test('returns a ready, usable FEService instance', async () => {
        const fe = await getFlowerEvolver();
        fe.setParams(new FEParams(32, 3, 6.0, 1.0));
        const flower = await fe.makeFlower();
        expect(flower.genome).toContain('"Flower"');
        expect(flower.image).toMatch(/^data:image\/png;base64,/);
    });

    test('returns the same instance on repeated calls', async () => {
        const first = await getFlowerEvolver();
        const second = await getFlowerEvolver();
        expect(first).toBe(second);
    });

    test('concurrent calls before init resolves share the same instance, not a half-initialized one', async () => {
        const [a, b] = await Promise.all([getFlowerEvolver(), getFlowerEvolver()]);
        expect(a).toBe(b);
        // and it must actually be usable, not just non-null
        a.setParams(new FEParams(32, 3, 6.0, 1.0));
        const flower = await a.makeFlower();
        expect(flower.image).toMatch(/^data:image\/png;base64,/);
    });

    test('_resetFlowerEvolverForTests() forces a genuinely new instance', async () => {
        const first = await getFlowerEvolver();
        _resetFlowerEvolverForTests();
        const second = await getFlowerEvolver();
        expect(first).not.toBe(second);
    });

    describe('keptPetals', () => {
        test('are the params that were given when the wasm has nothing to limit', async () => {
            const kept = await keptPetals({ radius: 100, numLayers: 5, P: 3.5, bias: -2 });

            expect(kept).toEqual({ radius: 100, numLayers: 5, P: 3.5, bias: -2 });
        });

        test.each([
            [{ radius: 1, numLayers: 3, P: 6, bias: 1 }, { radius: 4, numLayers: 2, P: 6, bias: 1 }],
            [{ radius: 512, numLayers: 3, P: 6, bias: 1 }, { radius: 256, numLayers: 3, P: 6, bias: 1 }],
            [{ radius: 64, numLayers: 0, P: 6, bias: 1 }, { radius: 64, numLayers: 1, P: 6, bias: 1 }],
            [{ radius: 64, numLayers: 20, P: 6, bias: 1 }, { radius: 64, numLayers: 6, P: 6, bias: 1 }],
            [{ radius: 100, numLayers: 6, P: 6, bias: 1 }, { radius: 100, numLayers: 6, P: 6, bias: 1 }],
            [{ radius: 64, numLayers: 2.7, P: 6, bias: 1 }, { radius: 64, numLayers: 2, P: 6, bias: 1 }],
        ])('%j is kept as %j: the limits are the ones of the wasm', async (given, expected) => {
            expect(await keptPetals(given)).toEqual(expected);
        });

        test('does not limit P and bias: the wasm does not', async () => {
            const kept = await keptPetals({ radius: 64, numLayers: 3, P: -3.5, bias: 1e9 });

            expect(kept).toMatchObject({ P: -3.5, bias: 1e9 });
        });

        test('leaves the evolver with the params that it had', async () => {
            const fe = await getFlowerEvolver();
            fe.setParams(new FEParams(32, 2, 4, 0.5));
            const had = fe.getParams();

            await keptPetals({ radius: 128, numLayers: 5, P: 9, bias: 9 });

            expect(fe.getParams()).toBe(had);
            expect(fe.getParams()).toMatchObject({ radius: 32, numLayers: 2, P: 4, bias: 0.5 });
        });

        test('leaves the evolver with the params that it had when the wasm fails, and says it', async () => {
            const fe = await getFlowerEvolver();
            fe.setParams(new FEParams(32, 2, 4, 0.5));
            const had = fe.getParams();
            const makePetals = fe.makePetals;
            fe.makePetals = async () => { throw new Error('wasm'); };

            try{
                await expect(keptPetals({ radius: 128, numLayers: 5, P: 9, bias: 9 })).rejects.toThrow('wasm');
                expect(fe.getParams()).toBe(had);
            }finally{
                fe.makePetals = makePetals;
            }
        });

        test('does not change what it is given', async () => {
            const given = { radius: 1, numLayers: 20, P: 6, bias: 1 };

            await keptPetals(given);

            expect(given).toEqual({ radius: 1, numLayers: 20, P: 6, bias: 1 });
        });

        test('are the four params and nothing of the flower that was made', async () => {
            const kept = await keptPetals({ radius: 64, numLayers: 3, P: 6, bias: 1 });

            expect(Object.keys(kept).sort()).toEqual(['P', 'bias', 'numLayers', 'radius']);
        });
    });
});
