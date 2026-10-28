import { defineStore } from 'pinia';
import { markRaw } from 'vue';
import { getSpeciesClient } from '../../services/speciesWorker';
import { SpeciesModel } from '../../services/SpeciesModel';
import { SpeciesClient } from '../../services/SpeciesClient';
import { SpeciesTrainer } from '../../services/SpeciesTrainer';
import * as speciesRepository from '../../services/speciesRepository';
import * as flowerRepository from '../../services/flowerRepository';
import { useErrorStore } from '../ErrorStore';

// How many flowers are classified at once. The slow part is rendering them, the more that go in one
// call the longer the classifier is busy for whoever is waiting behind.
const BATCH = 25;
// The distance has no scale of its own, so a flower is atypical when it is farther from its species
// than the mean plus 2 standard deviations of the distances of all the flowers. Fewer flowers than
// this say nothing about what is usual.
const MIN_FLOWERS_FOR_ATYPICAL = 20;
// While a lot of flowers are being classified the summary is read at most this often.
const SUMMARY_EVERY_MS = 1000;

// The ids waiting to be classified, and every id that is waiting or in the batch being classified.
// They are not state: nothing shows them and they must not be turned into Proxies.
let queue = [];
let pending = new Set();
let draining = false;
let drainPromise = Promise.resolve();
let startPromise = null;
let lastSummary = 0;
// the AbortController of the fine-tuning that is running
let controller = null;
// the species ("x,y") whose flowers ensureSub is placing in their sub-species
let subRunning = new Set();
// ensureFor and classifyStale read the tables before they queue anything, whenIdle waits for them
let preparing = new Set();
const track = (work) => {
    preparing.add(work);
    work.finally(() => preparing.delete(work));
    return work;
};

// What fails in the background is said in the console. Deleting the flowers closes the database for a
// moment, so what was in the middle of its work fails with this and it is not worth saying.
const background = (message) => (e) => {
    if(e?.name !== 'DatabaseClosedError'){
        console.warn(message, e);
    }
};

/** Only for tests - forgets the queue and the started classifier. */
export function _resetSpeciesStoreForTests(){
    queue = [];
    pending = new Set();
    draining = false;
    drainPromise = Promise.resolve();
    startPromise = null;
    lastSummary = 0;
    controller = null;
    subRunning = new Set();
    preparing = new Set();
}

// what the fine-tuning shows: where it is, the distance to the prototypes after each epoch, the
// classifier before and now (to compare how the flowers are spread), and how it ended
const emptyTraining = () => ({
    kind: null, ran: null, phase: '', done: 0, total: 0, qe: [], before: null, now: null, result: null
});

// the row of the species table of a flower that was matched, or null if it cannot be classified
const speciesRow = (id, match, fp) => {
    return match === null
        ? { id, x: null, y: null, d: null, fp }
        : { id, x: match.x, y: match.y, d: match.distance, fp };
};

const BUSY = 'Your flowers are still being classified, try again in a moment.';
const describeSplit = (result, name) => {
    switch(result.outcome){
        case 'done':
            return `Done: ${name} is now ${result.width * result.height} sub-species.`;
        case 'too-few':
            return `${name} has ${result.flowers} ${result.flowers === 1 ? 'flower' : 'flowers'}, and these sub-species need at least ${result.needed}. Use fewer cells or make more flowers.`;
        case 'cancelled':
            return 'Cancelled, nothing was changed.';
        default:
            return 'None of the flowers of this species can be classified.';
    }
};
const describeRun = (result) => {
    const f = (n) => n.toFixed(3);
    switch(result.outcome){
        case 'done': {
            const { before, after } = result;
            return `Done. Mean distance to the species prototype ${f(before.meanQuantizationError)} to ${f(after.meanQuantizationError)}; ` +
                `species in use ${before.usedNodes} to ${after.usedNodes} of ${after.totalNodes}; ` +
                `most crowded species ${before.busiestNodeCount} to ${after.busiestNodeCount} flowers.`;
        }
        case 'cancelled':
            return 'Cancelled, the classifier is unchanged.';
        case 'no-flowers':
            return 'Make some flowers first, there is nothing to fine-tune on.';
        default:
            return 'None of your flowers can be classified.';
    }
};

/**
 * @brief The species of the local flowers: which cell of the classifier each one is in.
 *
 * A flower is classified once for the classifier in use and the result is kept in the species table, see
 * speciesRepository. Nothing here waits for a classification: creating a flower only asks for it with
 * classifyLater(id) and the badge shows up when it is done. A failure of that background work goes to the
 * console, what the person asked for (fine-tuning, ...) reports to the ErrorStore.
 *
 * It does not import the flower stores. They call into it when a flower is created or deleted.
 */
export const useSpeciesStore = defineStore('SpeciesStore', {
    state: () => ({
        // the classifier in use, null until start() is done
        model: null,
        fp: '',
        hasTuned: false,
        status: 'idle',
        // flowers of this run of classifications, done and in total
        progress: { done: 0, total: 0 },
        // the species the Species tab shows, { x, y } or null
        selected: null,
        // the sub-species of the selected species the list is filtered by, { x, y } or null for all of it
        selectedSub: null,
        // the species that are split, "x,y" -> { subfp, w, h, flowers }, for the classifier in use
        submaps: new Map(),
        // the fine-tuning, kind is null when there is none running; the last one is kept to be read
        training: emptyTraining(),
        // changes when the classifier in use is replaced, what was selected is not the same species anymore
        generation: 0,
        // id of a flower -> its row of the species table, for the ones that were on screen
        rows: new Map(),
        // read from the species table: flowers in each cell ("x,y" -> n), how many were classified,
        // the distance from which a flower is atypical (null when there are too few flowers) and how many are
        summary: { counts: new Map(), classified: 0, atypicalAbove: null, atypical: 0 },
    }),
    getters: {
        isReady: (state) => state.model !== null,
        isTuning: (state) => state.training.kind !== null,
        // the species of a flower, only while it is the one of the classifier in use
        rowFor: (state) => (id) => {
            const row = state.rows.get(id);
            return row !== undefined && row.fp === state.fp && row.x !== null ? row : undefined;
        },
        // the label of the sub-species of a row of the species table ('a', 'b', ...), empty when it has none:
        // the species is not split, or the row was placed by a map that is not there anymore
        subLabelFor: (state) => (row) => {
            const submap = state.submaps.get(`${row.x},${row.y}`);
            if(submap === undefined || row.sfp !== submap.subfp || typeof row.sx !== 'number'){
                return '';
            }
            return SpeciesModel.subLabel(row.sy * submap.w + row.sx);
        },
        // the sub-species map of a species, undefined when it is not split
        submapOf: (state) => (x, y) => state.submaps.get(`${x},${y}`),
        // the name of a species, empty until the classifier is in use
        nameOf: (state) => (x, y) => state.model === null ? '' : state.model.nameOf(x, y),
        isAtypical: (state) => (row) => {
            return state.summary.atypicalAbove !== null && row.d > state.summary.atypicalAbove;
        },
    },
    actions: {
        /** @brief Reads what is saved without starting the worker, so any view can ask. */
        async loadSaved(){
            this.hasTuned = (await speciesRepository.getClassifier('tuned')) !== undefined;
        },
        /**
         * @brief Starts the worker and puts the classifier in use: the fine-tuned one if there is one.
         * Done once, whoever asks first. It fails (and can be asked again) if the worker does.
         */
        start(){
            if(startPromise === null){
                startPromise = (async () => {
                    const client = getSpeciesClient();
                    const tuned = await speciesRepository.getClassifier('tuned');
                    let info = null;
                    let model = null;
                    if(tuned !== undefined){
                        try{
                            await client.loadSOM(tuned.json);
                            info = await client.getModel();
                            model = SpeciesModel.fromJson(info.json);
                        }catch(_){
                            const ErrorStore = useErrorStore();
                            ErrorStore.push("couldn't load the fine-tuned classifier, the built-in one is used.");
                            await client.loadSOM('');
                            model = null;
                        }
                    }
                    if(model === null){
                        info = await client.getModel();
                        model = SpeciesModel.fromJson(info.json);
                    }
                    this.model = markRaw(model);
                    this.fp = info.fp;
                    this.hasTuned = info.custom;
                    await this.loadSubmaps();
                })().catch((e) => {
                    startPromise = null;
                    throw e;
                });
            }
            return startPromise;
        },
        /**
         * @brief Asks for a flower that was just stored to be classified and goes on.
         * @returns {Promise} that is done when the flowers waiting at that moment were classified. Never fails.
         */
        classifyLater(id){
            return this.enqueue([id]);
        },
        /**
         * @brief Classifies the flowers of a page that have no species yet, for the classifier in use.
         * The ones that have it are only read. Never fails.
         */
        ensureFor(ids){
            return track((async () => {
                try{
                    await this.start();
                    const rows = await speciesRepository.bulkGetSpecies(ids);
                    const missing = [];
                    ids.forEach((id, i) => {
                        if(rows[i] !== undefined && rows[i].fp === this.fp){
                            this.rows.set(id, rows[i]);
                        }else{
                            missing.push(id);
                        }
                    });
                    return this.enqueue(missing);
                }catch(e){
                    background("couldn't read the species of some flowers")(e);
                }
            })());
        },
        /** @brief Classifies every flower that has no species for the classifier in use, newest first. Never fails. */
        classifyStale(){
            return track((async () => {
                try{
                    await this.start();
                    const all = await flowerRepository.listFlowerIds();
                    const current = new Set((await speciesRepository.listCurrent(this.fp)).map((row) => row.id));
                    return this.enqueue(all.reverse().filter((id) => !current.has(id)));
                }catch(e){
                    background("couldn't classify the flowers")(e);
                }
            })());
        },
        /**
         * @returns {Promise} that is done when the flowers waiting at this moment were classified, and the
         * ones that ensureFor and classifyStale are still finding out about.
         */
        async whenIdle(){
            await Promise.all([...preparing]);
            return drainPromise;
        },
        enqueue(ids){
            let added = 0;
            for(const id of ids){
                if(!pending.has(id)){
                    pending.add(id);
                    queue.push(id);
                    ++added;
                }
            }
            this.progress.total += added;
            if(!draining && queue.length > 0){
                draining = true;
                drainPromise = this.drain();
            }
            return drainPromise;
        },
        async drain(){
            this.status = 'classifying';
            try{
                await this.start();
                while(queue.length > 0){
                    const ids = queue.splice(0, BATCH);
                    try{
                        await this.classifyIds(ids);
                    }catch(e){
                        background("couldn't classify some flowers")(e);
                    }finally{
                        for(const id of ids){
                            pending.delete(id);
                        }
                        this.progress.done += ids.length;
                    }
                    if(Date.now() - lastSummary >= SUMMARY_EVERY_MS){
                        lastSummary = Date.now();
                        await this.refreshSummary().catch(background("couldn't read the species"));
                    }
                }
            }catch(e){
                // the worker did not start: whatever waits is asked for again by the next ensureFor
                console.warn("couldn't start the species classifier", e);
                queue = [];
                pending = new Set();
            }finally{
                // in the same turn the loop found the queue empty, nothing can be queued in between
                draining = false;
                this.status = 'idle';
                this.progress = { done: 0, total: 0 };
            }
            await this.refreshSummary().catch(background("couldn't read the species"));
        },
        async classifyIds(ids){
            const stored = await flowerRepository.bulkGetFlowers(ids);
            // a flower deleted while it waited is not classified
            const flowers = stored.filter((flower) => flower !== undefined);
            if(flowers.length === 0){
                return;
            }
            const { matches, fp } = await getSpeciesClient().classifyBatch(flowers.map((flower) => flower.genome));
            const rows = flowers.map((flower, i) => speciesRow(flower.id, matches[i], fp));
            // the species of a flower follows its genome: not what was deleted, replaced or renumbered
            // (deleteNonFavourites does) while the classifier was working on it.
            const now = await flowerRepository.bulkGetFlowers(flowers.map((flower) => flower.id));
            const keep = rows.filter((_row, i) => now[i]?.genome === flowers[i].genome);
            await speciesRepository.bulkPutSpecies(keep);
            for(const row of keep){
                this.rows.set(row.id, row);
            }
            // the flowers that came to a split species are placed in its sub-species
            const byCell = new Map();
            for(const row of keep){
                if(row.x !== null && this.submaps.has(`${row.x},${row.y}`)){
                    const key = `${row.x},${row.y}`;
                    byCell.set(key, [...(byCell.get(key) ?? []), row]);
                }
            }
            for(const [key, cellRows] of byCell){
                await this.placeInSub(key, cellRows).catch(background("couldn't place some flowers in their sub-species"));
            }
        },
        // Puts the flowers (current rows of one species) in the sub-species of that species, with the map saved.
        // A row is only written if it is still what it was: the flower was not classified again meanwhile.
        async placeInSub(key, rows){
            const record = await speciesRepository.getClassifier(`sub:${this.fp}:${key}`);
            if(record === undefined){
                return;
            }
            const flowers = (await flowerRepository.bulkGetFlowers(rows.map((row) => row.id)));
            const present = rows.map((row, i) => ({ row, flower: flowers[i] })).filter(({ flower }) => flower !== undefined);
            if(present.length === 0){
                return;
            }
            const { matches, fp } = await getSpeciesClient().classifyBatchWith(record.json, present.map(({ flower }) => flower.genome));
            const [currentRows, nowFlowers] = await Promise.all([
                speciesRepository.bulkGetSpecies(present.map(({ row }) => row.id)),
                flowerRepository.bulkGetFlowers(present.map(({ row }) => row.id)),
            ]);
            const written = [];
            present.forEach(({ row, flower }, i) => {
                const current = currentRows[i];
                const unchanged = current !== undefined && current.fp === row.fp && current.x === row.x && current.y === row.y
                    && nowFlowers[i]?.genome === flower.genome;
                if(unchanged){
                    const match = matches[i];
                    written.push({ ...current, sx: match ? match.x : null, sy: match ? match.y : null, sfp: fp });
                }
            });
            await speciesRepository.bulkPutSpecies(written);
            for(const row of written){
                this.rows.set(row.id, row);
            }
        },
        /**
         * @brief The map of a split species to show: its prototypes and how many flowers are in each sub-species.
         * @param {Object} cell - { x, y } of the species.
         * @returns {Promise<Object|null>} { model, counts, subfp }, or null when it is not split.
         */
        async readSubspecies(cell){
            const submap = this.submapOf(cell.x, cell.y);
            const record = submap === undefined ? undefined : await speciesRepository.getClassifier(`sub:${this.fp}:${cell.x},${cell.y}`);
            if(record === undefined){
                return null;
            }
            const counts = await speciesRepository.countSubCells({ x: cell.x, y: cell.y, fp: this.fp, subfp: record.subfp });
            return { model: markRaw(SpeciesModel.fromJson(record.json)), counts, subfp: record.subfp };
        },
        /** @brief Reads which species are split, for the classifier in use. */
        async loadSubmaps(){
            const submaps = new Map();
            for(const record of await speciesRepository.listSubmaps(this.fp)){
                submaps.set(`${record.x},${record.y}`, { subfp: record.subfp, w: record.w, h: record.h, flowers: record.flowers });
            }
            this.submaps = submaps;
        },
        /**
         * @brief Places the flowers of a split species that are not in a sub-species yet, the ones made after the
         * split. Never fails; while it runs fine-tune, reset, split and unsplit answer 'busy'.
         */
        ensureSub(cell){
            const key = `${cell.x},${cell.y}`;
            return track((async () => {
                if(subRunning.has(key) || !this.submaps.has(key)){
                    return;
                }
                subRunning.add(key);
                try{
                    const { subfp } = this.submaps.get(key);
                    const missing = await speciesRepository.listRowsWithoutSub({ x: cell.x, y: cell.y, fp: this.fp, subfp });
                    for(let i = 0; i < missing.length; i += BATCH){
                        await this.placeInSub(key, missing.slice(i, i + BATCH));
                    }
                }catch(e){
                    background("couldn't place the flowers in their sub-species")(e);
                }finally{
                    subRunning.delete(key);
                }
            })());
        },
        /**
         * @brief Splits a species in sub-species: trains a small map on its flowers and keeps it.
         * The progress is in `training` (kind 'split'). It does not start while the flowers are being classified or
         * something else is running, and a failure goes to the ErrorStore.
         * @param {Object} params - { cell: { x, y }, width, height, epochs }, see SpeciesTrainer.split().
         * @returns {Promise<string>} 'done', 'cancelled', 'too-few', 'unusable', 'busy' or 'failed'.
         */
        async split({ cell, width, height, epochs }){
            if(this.isTuning){
                return 'busy';
            }
            if(this.status === 'classifying' || subRunning.size > 0){
                this.training = { ...emptyTraining(), ran: 'split', result: { outcome: 'busy', message: BUSY } };
                return 'busy';
            }
            controller = new AbortController();
            this.training = { ...emptyTraining(), kind: 'split', ran: 'split' };
            const name = this.nameOf(cell.x, cell.y);
            let outcome;
            try{
                await this.start();
                const ids = await speciesRepository.listAllFlowerIdsByCell({ x: cell.x, y: cell.y, fp: this.fp });
                const result = await new SpeciesTrainer(getSpeciesClient()).split({
                    width, height, epochs, ids,
                    signal: controller.signal,
                    onProgress: (event) => this.trainingProgress(event)
                });
                if(result.outcome === 'done'){
                    await this.adoptSplit(cell, result);
                }
                outcome = result.outcome;
                this.training.result = { outcome, message: describeSplit(result, name) };
            }catch(e){
                outcome = 'failed';
                this.training.result = { outcome, message: 'Splitting failed.' };
                useErrorStore().push(e);
            }finally{
                controller = null;
                this.training.kind = null;
            }
            if(outcome === 'done'){
                // the flowers made while it ran
                this.ensureSub(cell);
            }
            return outcome;
        },
        // Keeps the map and where the flowers of the species are in it. A flower is only kept if it is still in
        // that species with the genome it was placed from.
        async adoptSplit(cell, result){
            const key = `${cell.x},${cell.y}`;
            await speciesRepository.putClassifier({
                id: `sub:${this.fp}:${key}`, fp: this.fp, x: cell.x, y: cell.y, json: result.model.json,
                subfp: result.model.fp, w: result.width, h: result.height, flowers: result.flowers, at: Date.now()
            });
            const written = [];
            for(let i = 0; i < result.rows.length; i += BATCH){
                const rows = result.rows.slice(i, i + BATCH);
                const [current, flowers] = await Promise.all([
                    speciesRepository.bulkGetSpecies(rows.map((row) => row.id)),
                    flowerRepository.bulkGetFlowers(rows.map((row) => row.id)),
                ]);
                rows.forEach((row, k) => {
                    const here = current[k];
                    const same = here !== undefined && here.fp === this.fp && here.x === cell.x && here.y === cell.y
                        && flowers[k] !== undefined && SpeciesClient.fingerprint(flowers[k].genome) === row.hash;
                    if(same){
                        written.push({ ...here, sx: row.match ? row.match.x : null, sy: row.match ? row.match.y : null, sfp: row.sfp });
                    }
                });
            }
            await speciesRepository.bulkPutSpecies(written);
            for(const row of written){
                this.rows.set(row.id, row);
            }
            this.selectedSub = null;
            await this.loadSubmaps();
        },
        /**
         * @brief Takes the sub-species of a species away. Its flowers stay in the species.
         * @returns {Promise<string>} 'done', 'busy' or 'failed'.
         */
        async unsplit(cell){
            if(this.isTuning || this.status === 'classifying' || subRunning.size > 0){
                return 'busy';
            }
            try{
                await speciesRepository.deleteClassifier(`sub:${this.fp}:${cell.x},${cell.y}`);
                await speciesRepository.clearSubRows(cell);
                for(const [id, row] of this.rows){
                    if(row.x === cell.x && row.y === cell.y){
                        const copy = { ...row };
                        delete copy.sx;
                        delete copy.sy;
                        delete copy.sfp;
                        this.rows.set(id, copy);
                    }
                }
                this.selectedSub = null;
                await this.loadSubmaps();
                return 'done';
            }catch(e){
                useErrorStore().push(e);
                return 'failed';
            }
        },
        /** @brief Reads the species table to know how many flowers each species has and what is atypical. */
        async refreshSummary(){
            const counts = new Map();
            const distances = [];
            for(const row of await speciesRepository.listCurrent(this.fp)){
                if(row.x === null){
                    continue;
                }
                const key = `${row.x},${row.y}`;
                counts.set(key, (counts.get(key) ?? 0) + 1);
                distances.push(row.d);
            }
            let atypicalAbove = null;
            if(distances.length >= MIN_FLOWERS_FOR_ATYPICAL){
                const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
                const std = Math.sqrt(distances.reduce((a, d) => a + (d - mean) * (d - mean), 0) / distances.length);
                atypicalAbove = mean + 2 * std;
            }
            const atypical = atypicalAbove === null ? 0 : distances.filter((d) => d > atypicalAbove).length;
            this.summary = { counts, classified: distances.length, atypicalAbove, atypical };
        },
        /**
         * @brief Fine-tunes the classifier on the flowers, keeps it, and classifies the flowers again with it.
         * The progress is in `training`. It does not start while the flowers are being classified or another
         * fine-tuning is running, and a failure goes to the ErrorStore.
         * @param {Object} params - { epochs, baseLR, baseRadius }, see SpeciesTrainer.fineTune().
         * @returns {Promise<string>} 'done', 'cancelled', 'no-flowers', 'unusable', 'busy' or 'failed'.
         */
        async fineTune(params){
            if(this.isTuning){
                return 'busy';
            }
            if(this.status === 'classifying' || subRunning.size > 0){
                this.training = { ...emptyTraining(), ran: 'fineTune', result: { outcome: 'busy', message: BUSY } };
                return 'busy';
            }
            controller = new AbortController();
            this.training = { ...emptyTraining(), kind: 'fineTune', ran: 'fineTune' };
            let outcome;
            try{
                await this.start();
                const result = await new SpeciesTrainer(getSpeciesClient()).fineTune({
                    ...params,
                    signal: controller.signal,
                    onProgress: (event) => this.trainingProgress(event)
                });
                if(result.outcome === 'done'){
                    await this.adoptTuned(result);
                }
                outcome = result.outcome;
                this.training.result = { outcome, message: describeRun(result) };
            }catch(e){
                outcome = 'failed';
                this.training.result = { outcome, message: 'Fine-tuning failed.' };
                useErrorStore().push(e);
            }finally{
                controller = null;
                this.training.kind = null;
            }
            if(outcome === 'done'){
                // the flowers made while it ran
                this.classifyStale();
            }
            return outcome;
        },
        cancelTraining(){
            controller?.abort();
        },
        trainingProgress(event){
            this.training.phase = event.phase;
            this.training.done = event.done;
            this.training.total = event.total;
            if(event.phase === 'training'){
                this.training.now = event.evaluation;
                if(event.done === 0){
                    this.training.before = event.evaluation;
                    this.training.qe = [event.evaluation.meanQuantizationError];
                }else{
                    this.training.qe.push(event.evaluation.meanQuantizationError);
                }
            }
        },
        // Keeps the fine-tuned classifier and where the flowers are for it. A flower is only kept if it
        // still has the genome it was classified from, it may have been deleted or renumbered meanwhile.
        async adoptTuned(result){
            await speciesRepository.putClassifier({ id: 'tuned', json: result.model.json });
            // a sub-species map is only true for the classifier it was trained under
            await speciesRepository.clearSubmaps();
            this.submaps = new Map();
            this.selectedSub = null;
            const kept = [];
            for(let i = 0; i < result.rows.length; i += BATCH){
                const rows = result.rows.slice(i, i + BATCH);
                const flowers = await flowerRepository.bulkGetFlowers(rows.map((row) => row.id));
                rows.forEach((row, k) => {
                    if(flowers[k] !== undefined && SpeciesClient.fingerprint(flowers[k].genome) === row.hash){
                        kept.push(speciesRow(row.id, row.match, row.fp));
                    }
                });
            }
            await speciesRepository.bulkPutSpecies(kept);
            this.model = markRaw(SpeciesModel.fromJson(result.model.json));
            this.fp = result.model.fp;
            this.hasTuned = true;
            this.invalidate();
            // the counts are not what decides if it worked
            await this.refreshSummary().catch(background("couldn't read the species"));
            ++this.generation;
        },
        /**
         * @brief Goes back to the classifier built into the wasm: the fine-tuned one and the sub-species
         * are deleted, the flowers stay and are classified again.
         * @returns {Promise<string>} 'done', 'busy' or 'failed'.
         */
        async resetClassifier(){
            if(this.isTuning || this.status === 'classifying' || subRunning.size > 0){
                return 'busy';
            }
            try{
                // the worker first: if it cannot, the saved one is still there for the next time
                const started = startPromise !== null;
                if(started){
                    await this.start();
                    await getSpeciesClient().loadSOM('');
                }
                await speciesRepository.clearClassifier();
                await speciesRepository.clearSubRows();
                this.submaps = new Map();
                this.selectedSub = null;
                this.hasTuned = false;
                if(started){
                    const info = await getSpeciesClient().getModel();
                    this.model = markRaw(SpeciesModel.fromJson(info.json));
                    this.fp = info.fp;
                    this.invalidate();
                    await this.refreshSummary().catch(background("couldn't read the species"));
                    ++this.generation;
                    this.classifyStale();
                }
                return 'done';
            }catch(e){
                useErrorStore().push(e);
                return 'failed';
            }
        },
        /** @brief The species the Species tab shows, null for none. */
        select(cell){
            const same = cell !== null && this.selected !== null && cell.x === this.selected.x && cell.y === this.selected.y;
            if(!same){
                this.selectedSub = null;
            }
            this.selected = cell === null ? null : { x: cell.x, y: cell.y };
        },
        /** @brief The sub-species the list of the selected species is filtered by, null for all of it. */
        selectSub(sub){
            this.selectedSub = sub === null ? null : { x: sub.x, y: sub.y };
        },
        /**
         * @brief The id of a random flower of a species, for the classifier in use.
         * @param {Object} cell - { x, y } of the species.
         * @param {Function} random - Where the luck comes from, () => number in [0, 1). For tests.
         * @param {Object|null} sub - { x, y } of a sub-species of that species, to pick from it only.
         * @return {Promise<number|null>} null when the species (or the sub-species) has no flowers.
         */
        async randomFlowerIn(cell, random = Math.random, sub = null){
            if(!this.isReady){
                return null;
            }
            const where = { x: cell.x, y: cell.y, fp: this.fp };
            const submap = sub === null ? undefined : this.submapOf(cell.x, cell.y);
            if(submap !== undefined){
                where.sub = { x: sub.x, y: sub.y, fp: submap.subfp };
            }
            const count = await speciesRepository.countByCell(where);
            if(count === 0){
                return null;
            }
            // Math.min: random() is below 1, but a source that is not has to stay in the list
            const offset = Math.min(count - 1, Math.floor(random() * count));
            const [id] = await speciesRepository.listFlowerIdsByCell({ ...where, limit: 1, offset });
            return id ?? null;
        },
        /** @brief A flower was deleted. */
        async removeFlower(id){
            await speciesRepository.deleteSpecies(id);
            this.rows.delete(id);
        },
        /**
         * @brief The flowers were deleted or renumbered, what was known by id is not true anymore.
         * The rows of the database are the business of whoever did it, see wipeDatabase().
         */
        invalidate(){
            this.rows = new Map();
            this.summary = { counts: new Map(), classified: 0, atypicalAbove: null, atypical: 0 };
        },
    },
});
