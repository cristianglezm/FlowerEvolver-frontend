import { describe, test, expect, afterEach } from 'vitest';
import { getFlowerEvolver, _resetFlowerEvolverForTests } from '../../../src/services/flowerEvolver';
import { SpeciesModel } from '../../../src/services/SpeciesModel';
import { classifierJson } from '../helpers/classifier';

describe('SpeciesModel', () => {
    afterEach(() => {
        _resetFlowerEvolverForTests();
    });

    describe('fromJson', () => {
        test('converts the sizes EvoAI serializes as strings', () => {
            const model = SpeciesModel.fromJson(classifierJson());
            expect(model.width).toBe(2);
            expect(model.height).toBe(2);
            expect(model.inputDim).toBe(5);
            expect(model.imageSize).toBe(2);
            expect(model.toroidal).toBe(true);
        });

        test('toroidal is only true when the classifier says so', () => {
            expect(SpeciesModel.fromJson(classifierJson({ toroidal: false })).toroidal).toBe(false);
            expect(SpeciesModel.fromJson(classifierJson({ toroidal: undefined })).toroidal).toBe(false);
        });

        test.each([
            ['weights that do not fill the grid', { weights: [0, 0, 0] }],
            ['an empty grid', { width: '0' }],
            ['a silhouette larger than a cell', { inputDim: '3', weights: new Array(12).fill(0) }],
        ])('rejects %s', (_, overrides) => {
            expect(() => SpeciesModel.fromJson(classifierJson(overrides))).toThrow('unexpected classifier layout');
        });

        test('rejects JSON that is not a classifier', () => {
            expect(() => SpeciesModel.fromJson('{}')).toThrow();
            expect(() => SpeciesModel.fromJson('not json')).toThrow();
        });

        test('parses the classifier built into the wasm', async () => {
            const fe = await getFlowerEvolver();
            const model = SpeciesModel.fromJson(fe.getTrainedSOM());
            expect(model.width * model.height).toBeGreaterThan(0);
            expect(model.weights).toHaveLength(model.width * model.height * model.inputDim);
            expect(model.prototype(0, 0)).toHaveLength(model.imageSize * model.imageSize);
        });
    });

    describe('prototype and weights', () => {
        const model = SpeciesModel.fromJson(classifierJson());

        test('prototype is the silhouette, the first imageSize * imageSize values of the cell', () => {
            expect(model.prototype(0, 0)).toEqual([0, 0, 0, 0]);
            expect(model.prototype(1, 1)).toEqual([1, 2, 0, 0]);
        });

        test('weightsOf is the whole vector of the cell, row-major by (y * width + x)', () => {
            expect(model.weightsOf(0, 1)).toEqual([0, 2, 0, 0, 0]);
            expect(model.weightsOf(1, 1)).toEqual([1, 2, 0, 0, 3]);
        });
    });

    describe('nearest', () => {
        const model = SpeciesModel.fromJson(classifierJson());

        test('lists the other species closest first with their euclidean distance', () => {
            const near = model.nearest(0, 0, 2);
            expect(near.map(({ x, y }) => [x, y])).toEqual([[1, 0], [0, 1]]);
            expect(near[0].distance).toBeCloseTo(1);
            expect(near[1].distance).toBeCloseTo(2);
        });

        test('uses the whole weight vector, not only the silhouette', () => {
            // (1, 1) differs from the others in the fifth value too
            expect(model.nearest(1, 1, 3).map(({ x, y }) => [x, y])).toEqual([[0, 1], [1, 0], [0, 0]]);
        });

        test('never includes the species itself and returns fewer when there are fewer', () => {
            const near = model.nearest(0, 0, 10);
            expect(near).toHaveLength(3);
            expect(near.some(({ x, y }) => x === 0 && y === 0)).toBe(false);
        });
    });

    describe('naming', () => {
        const model = SpeciesModel.fromJson(classifierJson());

        test('neighbours in a row share a noun and neighbours in a column share an adjective', () => {
            expect(model.nameOf(0, 0)).toBe('Slender Aster');
            expect(model.nameOf(1, 0)).toBe('Ruffled Aster');
            expect(model.nameOf(0, 1)).toBe('Slender Iris');
        });

        test('every cell of a grid larger than the word lists gets a different name', () => {
            const size = 13;
            const big = new SpeciesModel({ width: size, height: size, inputDim: 1, imageSize: 1, toroidal: false, weights: [] });
            const names = new Set();
            for(let y = 0; y < size; ++y){
                for(let x = 0; x < size; ++x){
                    names.add(big.nameOf(x, y));
                }
            }
            expect(names.size).toBe(size * size);
            expect(big.nameOf(12, 0)).toBe('Slender Aster 2');
        });

        test('subLabel counts a, b, ... z and then continues with numbers', () => {
            expect(SpeciesModel.subLabel(0)).toBe('a');
            expect(SpeciesModel.subLabel(25)).toBe('z');
            expect(SpeciesModel.subLabel(26)).toBe('27');
        });
    });
});
