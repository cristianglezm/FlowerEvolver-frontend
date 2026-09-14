import { describe, test, expect, afterEach } from 'vitest';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { getFlowerEvolver, _resetFlowerEvolverForTests } from '../../../src/services/flowerEvolver';

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
});
