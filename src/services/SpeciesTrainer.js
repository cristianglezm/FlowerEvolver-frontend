import { SpeciesClient } from './SpeciesClient';
import * as flowerRepository from './flowerRepository';

// Flowers are read and rendered in small batches: the stored images never all sit in memory at once.
const BATCH = 25;
// A sub-species map is a small grid, it has to be at least 2 cells and at most 6 by 6, and every
// cell needs a few flowers to be worth having.
const MAX_SUB_SIDE = 6;
const MIN_FLOWERS_PER_SUBCELL = 3;
// Gives the page the chance to paint the progress before the next call, which blocks the worker.
const paint = () => new Promise((resolve) => setTimeout(resolve));

/**
 * @brief Fine-tunes the classifier on the flowers of the person, over a SpeciesClient.
 *
 * It only computes. It does not save the classifier or the species of the flowers, whoever asks does,
 * with what the run returns. The whole run is one session of the client, so nothing else is classified
 * in the middle of it, and the classifier that was in use comes back if it is cancelled or fails.
 *
 * The features of every flower are extracted once, which is where the time goes (every flower is
 * rendered) and kept for the run. Each epoch is then a call of its own, so the progress can be shown.
 *
 * @example
 * const trainer = new SpeciesTrainer(client);
 * const result = await trainer.fineTune({
 *     epochs: 3, baseLR: 0.3, baseRadius: 1,
 *     signal: controller.signal,
 *     onProgress: ({ phase, done, total, evaluation }) => { ... }
 * });
 * // result.outcome is 'done', 'cancelled', 'no-flowers' or 'unusable'
 * // on 'done': result.model ({ json, fp }), result.rows (the species of every flower), before and after
 */
export class SpeciesTrainer{
    #client;

    constructor(client){
        this.#client = client;
    }

    /**
     * @param {number} epochs - Whole number, at least 1.
     * @param {number} baseLR - Learning rate, above 0.
     * @param {number} baseRadius - Radius of the neighbourhood that is moved with the best species, above 0.
     * @param {Function} onProgress - Called with { phase: 'preparing', done, total } for the flowers read, and with
     * { phase: 'training', done, total, evaluation } for the classifier before the first epoch (done is 0) and after each.
     * @param {AbortSignal} signal - Aborted to cancel, it is looked at between batches and between epochs.
     * @returns {Promise<Object>} { outcome: 'cancelled' | 'no-flowers' | 'unusable' } and the classifier is as it was,
     * or { outcome: 'done', epochs, flowers, before, after, model: { json, fp }, rows }. A row is
     * { id, hash, fp, match } with the id of the flower, the fingerprint of the genome it was classified from,
     * and where it is now ({ x, y, distance } or null if it cannot be classified).
     * @throws {RangeError} For parameters out of range. Whatever else fails, the classifier is put back and it is thrown.
     */
    async fineTune({ epochs, baseLR, baseRadius, onProgress = () => {}, signal }){
        if(!Number.isInteger(epochs) || epochs < 1){
            throw new RangeError('epochs must be a whole number of at least 1');
        }
        if(!(baseLR > 0) || !Number.isFinite(baseLR)){
            throw new RangeError('the learning rate must be above 0');
        }
        if(!(baseRadius > 0) || !Number.isFinite(baseRadius)){
            throw new RangeError('the radius must be above 0');
        }
        const cancelled = () => signal?.aborted === true;
        return this.#client.session(async (run) => {
            const previous = await run.getModel();
            // '' is the built-in classifier
            const restore = () => run.loadSOM(previous.custom ? previous.json : '');
            try{
                const items = await this.#collect(run, onProgress, cancelled);
                if(items === null){
                    return { outcome: 'cancelled' };
                }
                if(items.length === 0){
                    return { outcome: 'no-flowers' };
                }
                const features = items.map((item) => item.features).filter((vector) => vector !== null);
                if(features.length === 0){
                    return { outcome: 'unusable' };
                }
                const before = await run.evaluateFeatures(features);
                let after = before;
                onProgress({ phase: 'training', done: 0, total: epochs, evaluation: before });
                for(let done = 0; done < epochs; ++done){
                    if(cancelled()){
                        await restore();
                        return { outcome: 'cancelled' };
                    }
                    await paint();
                    await run.fineTuneFeatures(features, 1, baseLR, baseRadius, done, epochs);
                    after = await run.evaluateFeatures(features);
                    onProgress({ phase: 'training', done: done + 1, total: epochs, evaluation: after });
                }
                const model = await run.getModel();
                // the flowers were just extracted, so they are classified from those vectors: nothing is rendered again
                const { matches, fp } = await run.classifyFeatures(items.map((item) => item.features));
                const rows = items.map((item, i) => ({ id: item.id, hash: item.hash, fp, match: matches[i] }));
                return {
                    outcome: 'done', epochs, flowers: features.length, before, after,
                    model: { json: model.json, fp: model.fp }, rows
                };
            }catch(e){
                // the classifier it was working on is not the one that was in use
                await restore().catch(() => {});
                throw e;
            }
        });
    }

    /**
     * @brief Trains a small map on the flowers of one species, to tell them apart in sub-species.
     * Like fineTune() it only computes, in one session, and the classifier in use is put back whatever
     * happens, also when it is done: the new map is returned, not left loaded.
     *
     * The map is not toroidal (on a grid this small the wrap would make every cell a neighbour of every
     * other), its prototypes start as flowers of the species so every cell begins inside the data, and it
     * learns with a rate of 0.5 and a radius of half its longest side.
     *
     * @param {number} width - Columns of the map, 1 to 6.
     * @param {number} height - Rows of the map, 1 to 6, and width * height at least 2.
     * @param {number} epochs - Whole number, at least 1.
     * @param {number[]} ids - The flowers of the species.
     * @param {Function} onProgress - As in fineTune().
     * @param {AbortSignal} signal - Aborted to cancel.
     * @param {Function} random - () => number in [0, 1), picks the flowers the prototypes start as. For tests.
     * @returns {Promise<Object>} { outcome: 'cancelled' | 'unusable' } or { outcome: 'too-few', flowers, needed }, or
     * { outcome: 'done', epochs, flowers, width, height, before, after, model: { json, fp }, rows } with a row
     * { id, hash, sfp, match } like fineTune()'s, where match is the sub-species ({ x, y, distance } or null).
     * @throws {RangeError} For parameters out of range.
     */
    async split({ width, height, epochs, ids, onProgress = () => {}, signal, random = Math.random }){
        const side = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_SUB_SIDE;
        if(!side(width) || !side(height) || width * height < 2){
            throw new RangeError(`the map has columns and rows from 1 to ${MAX_SUB_SIDE}, and 2 cells at least`);
        }
        if(!Number.isInteger(epochs) || epochs < 1){
            throw new RangeError('epochs must be a whole number of at least 1');
        }
        const needed = MIN_FLOWERS_PER_SUBCELL * width * height;
        if(ids.length < needed){
            return { outcome: 'too-few', flowers: ids.length, needed };
        }
        const cancelled = () => signal?.aborted === true;
        return this.#client.session(async (run) => {
            const previous = await run.getModel();
            const restore = () => run.loadSOM(previous.custom ? previous.json : '');
            try{
                const items = await this.#collect(run, onProgress, cancelled, ids);
                if(items === null){
                    return { outcome: 'cancelled' };
                }
                const vectors = items.map((item) => item.features).filter((vector) => vector !== null);
                if(vectors.length === 0){
                    return { outcome: 'unusable' };
                }
                if(vectors.length < needed){
                    return { outcome: 'too-few', flowers: vectors.length, needed };
                }
                await run.loadSOM(SpeciesTrainer.initialSubmapJson(previous.json, width, height, vectors, random));
                const radius = Math.max(width, height) / 2;
                const before = await run.evaluateFeatures(vectors);
                let after = before;
                onProgress({ phase: 'training', done: 0, total: epochs, evaluation: before });
                for(let done = 0; done < epochs; ++done){
                    if(cancelled()){
                        return { outcome: 'cancelled' };
                    }
                    await paint();
                    await run.fineTuneFeatures(vectors, 1, 0.5, radius, done, epochs);
                    after = await run.evaluateFeatures(vectors);
                    onProgress({ phase: 'training', done: done + 1, total: epochs, evaluation: after });
                }
                const model = await run.getModel();
                const { matches, fp } = await run.classifyFeatures(items.map((item) => item.features));
                const rows = items.map((item, i) => ({ id: item.id, hash: item.hash, sfp: fp, match: matches[i] }));
                return {
                    outcome: 'done', epochs, flowers: vectors.length, width, height, before, after,
                    model: { json: model.json, fp: model.fp }, rows
                };
            }finally{
                await restore().catch(() => {});
            }
        });
    }

    /**
     * @brief The JSON of a map of width x height whose prototypes are flowers (their feature vectors),
     * taken at random, with the layout of the classifier `mainJson`.
     */
    static initialSubmapJson(mainJson, width, height, vectors, random = Math.random){
        const data = JSON.parse(mainJson);
        const order = vectors.map((_vector, i) => i);
        for(let i = order.length - 1; i > 0; --i){
            const j = Math.floor(random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        const weights = [];
        for(let k = 0; k < width * height; ++k){
            weights.push(...vectors[order[k % order.length]]);
        }
        // EvoAI writes the sizes as strings
        data.som = { ...data.som, width: String(width), height: String(height), inputDim: String(vectors[0].length), toroidal: false, weights };
        return JSON.stringify(data);
    }

    // The features of the flowers (every one, or the ids), with the id and a fingerprint of the genome they
    // come from. null if it was cancelled.
    async #collect(run, onProgress, cancelled, only = null){
        const ids = only ?? await flowerRepository.listFlowerIds();
        const items = [];
        for(let i = 0; i < ids.length; i += BATCH){
            if(cancelled()){
                return null;
            }
            onProgress({ phase: 'preparing', done: i, total: ids.length });
            await paint();
            const flowers = (await flowerRepository.bulkGetFlowers(ids.slice(i, i + BATCH))).filter((flower) => flower !== undefined);
            const extracted = await run.extractFeatures(flowers.map((flower) => flower.genome));
            flowers.forEach((flower, k) => {
                items.push({ id: flower.id, hash: SpeciesClient.fingerprint(flower.genome), features: extracted[k] });
            });
        }
        return items;
    }
}
