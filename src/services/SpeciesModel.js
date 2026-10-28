const ADJECTIVES = ['Slender', 'Ruffled', 'Spiral', 'Stout', 'Feathered', 'Rounded',
    'Ragged', 'Delicate', 'Sprawling', 'Compact', 'Pointed', 'Gentle'];
const NOUNS = ['Aster', 'Iris', 'Lotus', 'Poppy', 'Orchid', 'Dahlia',
    'Peony', 'Lily', 'Zinnia', 'Camellia', 'Tulip', 'Daisy'];

/**
 * @brief Read-only view of a SOM classifier: its grid of species and what each one looks like.
 *
 * A species is a cell (x, y) of the grid. Each cell holds a weight vector of inputDim values whose
 * first imageSize * imageSize values are the silhouette of the cell's prototype flower, row-major,
 * each an alpha in [0, 1]. The cell at (x, y) starts at (y * width + x) * inputDim.
 *
 * It is a plain class with public fields. Keep it out of Pinia's reactivity with markRaw() when
 * it is put in a store, the weights array is large and never changes.
 *
 * @example
 * const model = SpeciesModel.fromJson(fe.getTrainedSOM());
 * model.nameOf(2, 0);          // 'Spiral Aster'
 * model.prototype(2, 0);       // alpha values to draw
 * model.nearest(2, 0, 4);      // [{ x, y, distance }, ...] the four most similar species
 */
export class SpeciesModel{
    constructor({ width, height, inputDim, imageSize, toroidal, weights }){
        this.width = width;
        this.height = height;
        this.inputDim = inputDim;
        this.imageSize = imageSize;
        this.toroidal = toroidal;
        this.weights = weights;
    }

    /**
     * @brief Parses the JSON of a classifier (FEService.getSOM() or getTrainedSOM()).
     * @throws Error if the JSON is not a classifier or its sizes do not add up.
     */
    static fromJson(json){
        const data = JSON.parse(json);
        // EvoAI serializes the sizes of the SOM as strings, hence Number().
        const model = new SpeciesModel({
            width: Number(data.som.width),
            height: Number(data.som.height),
            inputDim: Number(data.som.inputDim),
            imageSize: Number(data.input.imageWidth),
            toroidal: data.som.toroidal === true,
            weights: data.som.weights,
        });
        const valid = model.width > 0 && model.height > 0
            && model.imageSize * model.imageSize <= model.inputDim
            && model.weights.length === model.width * model.height * model.inputDim;
        if(!valid){
            throw new Error('unexpected classifier layout');
        }
        return model;
    }

    /**
     * @brief Default name of a species. Neighbours in a row share a noun and neighbours in a column
     * share an adjective. Grids larger than the word lists get a number to stay unique.
     *
     * The name belongs to the cell, not to the shape: it does not change when the classifier is
     * fine-tuned, so the prototype of "Slender Aster" can stop being slender.
     */
    nameOf(x, y){
        const block = Math.floor(x / ADJECTIVES.length) + Math.floor(y / NOUNS.length) * Math.ceil(this.width / ADJECTIVES.length);
        const name = `${ADJECTIVES[x % ADJECTIVES.length]} ${NOUNS[y % NOUNS.length]}`;
        return block === 0 ? name : `${name} ${block + 1}`;
    }

    /** @brief Label of the nth sub-species of a species: a, b, ... z, then 27, 28, ... */
    static subLabel(index){
        return index < 26 ? String.fromCharCode(97 + index) : String(index + 1);
    }

    /** @brief The weight vector of a species. */
    weightsOf(x, y){
        const start = (y * this.width + x) * this.inputDim;
        return this.weights.slice(start, start + this.inputDim);
    }

    /** @brief The silhouette of a species' prototype, imageSize * imageSize alpha values, row-major. */
    prototype(x, y){
        const start = (y * this.width + x) * this.inputDim;
        return this.weights.slice(start, start + this.imageSize * this.imageSize);
    }

    /**
     * @brief The species whose prototype is closest to the one at (x, y), closest first.
     * @param {number} count - How many to return.
     * @returns {Array<{x: number, y: number, distance: number}>} euclidean distance between weight vectors.
     */
    nearest(x, y, count){
        const mine = this.weightsOf(x, y);
        const others = [];
        for(let cy = 0; cy < this.height; ++cy){
            for(let cx = 0; cx < this.width; ++cx){
                if(cx === x && cy === y){
                    continue;
                }
                const other = this.weightsOf(cx, cy);
                let sum = 0;
                for(let k = 0; k < mine.length; ++k){
                    sum += (mine[k] - other[k]) ** 2;
                }
                others.push({ x: cx, y: cy, distance: Math.sqrt(sum) });
            }
        }
        others.sort((a, b) => a.distance - b.distance);
        return others.slice(0, count);
    }
}
