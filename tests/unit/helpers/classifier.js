// A 2x2 grid, 5 values per cell, the first 4 (imageWidth 2) are the silhouette: the layout of the
// JSON of a classifier, small enough to know what is in it.
export const classifierJson = (overrides = {}) => JSON.stringify({
    som: {
        width: '2', height: '2', inputDim: '5', toroidal: true,
        weights: [
            0, 0, 0, 0, 0, // (0, 0)
            1, 0, 0, 0, 0, // (1, 0)
            0, 2, 0, 0, 0, // (0, 1)
            1, 2, 0, 0, 3, // (1, 1)
        ],
        ...overrides,
    },
    input: { imageWidth: '2' },
});
