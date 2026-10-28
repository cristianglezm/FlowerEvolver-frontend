/**
 * @brief Awaitable access to the species classifier of an FEService, wherever it runs.
 *
 * FEService already does the work (classify, extract features, evaluate, fine-tune). The client adds
 * what it does not do:
 *   - the fingerprint of the classifier that produced a result. A classification is only valid for
 *     that classifier, and the classifier can be replaced while other jobs wait.
 *   - one call at a time, in order, so a result can never be stamped with the wrong fingerprint.
 *   - session(): an exclusive window for jobs made of several dependent calls, like fine-tuning.
 *   - genomes in, as they are stored: the client builds the {"Generation": [...]} FEService wants.
 *
 * The transport is what reaches the FEService, a function (method, args) => value | Promise.
 * SpeciesClient.fromWorker() makes one for species.worker.js. In tests it can be
 * (method, args) => fe[method](...args) to use an FEService on the same thread.
 * Arguments and results travel through postMessage, so they have to be plain data, not Vue proxies.
 *
 * @example
 * const client = SpeciesClient.fromWorker(new SpeciesWorker());
 * const { json, fp, custom } = await client.getModel();
 * const { matches } = await client.classifyBatch(flowers.map(f => f.genome));
 * // several calls that must not be interleaved with other jobs
 * await client.session(async (run) => {
 *     await run.loadSOM(subMapJson);
 *     const { matches } = await run.classifyBatch(genomes);
 *     await run.loadSOM(mainJson);
 * });
 */
export class SpeciesClient{
    #transport;
    // shared with the exclusive view session() hands out, so both see the same queue and fingerprint
    #state;
    #queued;

    /**
     * @param {Function} transport - (method, args) => value | Promise, reaches the FEService.
     * The other parameters are internal, see session().
     */
    constructor(transport, state = { fp: null, tail: Promise.resolve() }, queued = true){
        this.#transport = transport;
        this.#state = state;
        this.#queued = queued;
    }

    /** @brief A client that talks to species.worker.js, one request per call with the reply matched by id. */
    static fromWorker(worker){
        let nextId = 0;
        const pending = new Map();
        worker.onmessage = (e) => {
            const { jobType, id, value, error } = e.data;
            const call = pending.get(id);
            if(call === undefined){
                return;
            }
            pending.delete(id);
            if(jobType === 'result'){
                call.resolve(value);
            }else{
                call.reject(new Error(error));
            }
        };
        // a worker that dies (or never starts) would leave its calls waiting forever
        worker.onerror = (e) => {
            for(const call of pending.values()){
                call.reject(new Error(e.message || 'the species worker failed'));
            }
            pending.clear();
        };
        return new SpeciesClient((method, args) => new Promise((resolve, reject) => {
            const id = nextId++;
            pending.set(id, { resolve, reject });
            worker.postMessage({ jobType: 'call', id, method, args });
        }));
    }

    /** @brief FNV-1a, 32 bit, as lowercase hex. Identifies a classifier by its JSON. */
    static fingerprint(text){
        let hash = 0x811c9dc5;
        for(let i = 0; i < text.length; ++i){
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193);
        }
        return (hash >>> 0).toString(16);
    }

    /**
     * @brief The classifier in use: the one loaded or fine-tuned, else the one built into the wasm.
     * @returns {Promise<{json: string, fp: string, custom: boolean}>} custom is false for the built-in one.
     */
    getModel(){
        return this.#exec(async () => {
            const custom = await this.#transport('getSOM', []);
            const json = custom || await this.#transport('getTrainedSOM', []);
            this.#state.fp = SpeciesClient.fingerprint(json);
            return { json, fp: this.#state.fp, custom: custom !== '' };
        });
    }

    /**
     * @param {string} genome - as stored.
     * @returns {Promise<{match: {x: number, y: number, distance: number} | null, fp: string}>} match is null for an unusable genome.
     */
    classify(genome){
        return this.#exec(async () => {
            const match = await this.#transport('classify', [genome]);
            return { match, fp: await this.#fingerprint() };
        });
    }

    /**
     * @param {string[]} genomes - as stored.
     * @returns {Promise<{matches: Array, fp: string}>} one match per genome, in order, null for an unusable one.
     */
    classifyBatch(genomes){
        return this.#exec(async () => {
            const matches = await this.#transport('classifyBatch', [this.#generation(genomes)]);
            return { matches, fp: await this.#fingerprint() };
        });
    }

    /**
     * @brief The feature vector of every genome, extracted once (rendering is the slow part) so
     * several classify/evaluate/fine-tune steps can reuse it.
     * @returns {Promise<Array<number[] | null>>} one vector per genome, in order, null for an unusable one.
     */
    extractFeatures(genomes){
        return this.#exec(() => this.#transport('extractFeatures', [this.#generation(genomes)]));
    }

    /** @returns {Promise<{matches: Array, fp: string}>} */
    classifyFeatures(features){
        return this.#exec(async () => {
            const matches = await this.#transport('classifyFeatures', [features]);
            return { matches, fp: await this.#fingerprint() };
        });
    }

    /** @returns {Promise<Object>} the SOMEvaluation of the classifier in use over the features. */
    evaluateFeatures(features){
        return this.#exec(() => this.#transport('evaluateFeatures', [features]));
    }

    /** @brief Fine-tunes the classifier in use, replacing it. Call it once per epoch to report progress. */
    fineTuneFeatures(features, epochs, baseLR, baseRadius, epochOffset = 0, totalEpochs = 0){
        return this.#exec(async () => {
            try{
                await this.#transport('fineTuneFeatures', [features, epochs, baseLR, baseRadius, epochOffset, totalEpochs]);
            }finally{
                this.#state.fp = null;
            }
        });
    }

    /** @brief Replaces the classifier in use. An empty string goes back to the built-in one. */
    loadSOM(json){
        return this.#exec(async () => {
            try{
                await this.#transport('loadSOM', [json]);
            }finally{
                this.#state.fp = null;
            }
        });
    }

    /**
     * @brief Classifies with another classifier (a sub-species map) and puts the one in use back, in one session.
     * @param {string} json - The classifier to use, as stored.
     * @param {string[]} genomes - as stored.
     * @returns {Promise<{matches: Array, fp: string}>} fp is the one of `json`, not of the classifier in use.
     */
    classifyBatchWith(json, genomes){
        return this.session(async (run) => {
            const previous = await run.getModel();
            await run.loadSOM(json);
            try{
                return await run.classifyBatch(genomes);
            }finally{
                await run.loadSOM(previous.custom ? previous.json : '');
            }
        });
    }

    /**
     * @brief Runs several calls with nothing else in between. Everyone else waits until it is done.
     * @param {Function} fn - async (run) => ..., run has the methods of the client and runs them at once.
     * Call run.method(), not client.method(): that one waits for the session to end and would never return.
     */
    session(fn){
        return this.#exec(() => fn(new SpeciesClient(this.#transport, this.#state, false)));
    }

    #exec(task){
        if(!this.#queued){
            return Promise.resolve().then(task);
        }
        const run = this.#state.tail.then(task);
        this.#state.tail = run.catch(() => {});
        return run;
    }

    async #fingerprint(){
        if(this.#state.fp === null){
            const json = (await this.#transport('getSOM', [])) || await this.#transport('getTrainedSOM', []);
            this.#state.fp = SpeciesClient.fingerprint(json);
        }
        return this.#state.fp;
    }

    // An unusable genome becomes null, which FEService answers with null: the others in the batch
    // still get their result and the position of every flower is kept.
    #generation(genomes){
        const flowers = genomes.map((genome) => {
            try{
                return JSON.stringify(JSON.parse(genome).Flower ?? null);
            }catch(_){
                return 'null';
            }
        });
        return `{"Generation":[${flowers.join(',')}]}`;
    }
}
