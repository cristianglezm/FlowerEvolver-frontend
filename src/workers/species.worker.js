/**
 * @brief Runs the species classifier of an FEService off the main thread.
 *
 * It has its own FEService (wasm instance), so extracting features and fine-tuning, which render
 * flowers and can take seconds, never block the page. It only runs the calls it is asked for, the
 * SpeciesClient is the one that queues them, keeps the fingerprint and builds the arguments.
 * Only the methods listed in METHODS can be called.
 *
 * @param {String} jobType - "call"
 * @param {Number} id - chosen by the caller, the reply carries the same one.
 * @param {String} method - one of METHODS, the name of an FEService method.
 * @param {Array} args - the arguments of that method, plain data.
 *
 * @example
 * // call a method of the FEService
 *   speciesWorker.postMessage({
 *       jobType: "call",
 *       id: 7,
 *       method: "classifyBatch",
 *       args: ['{"Generation":[...]}']
 *   });
 * // its result
 *   self.postMessage({
 *       jobType: "result",
 *       id: 7,
 *       value: [{ x: 3, y: 1, distance: 1.7 }, null]
 *   });
 * // or the error it ended with
 *   self.postMessage({
 *       jobType: "error",
 *       id: 7,
 *       error: "no vector is usable"
 *   });
 */
import { getFlowerEvolver } from '../services/flowerEvolver';

const METHODS = new Set([
    'classify',
    'classifyBatch',
    'classifyFeatures',
    'extractFeatures',
    'evaluateFeatures',
    'fineTuneFeatures',
    'loadSOM',
    'getSOM',
    'getTrainedSOM',
]);

self.onmessage = async (e) => {
    const { jobType, id, method, args } = e.data;
    if(jobType !== 'call'){
        return;
    }
    try{
        if(!METHODS.has(method)){
            throw new Error(`unknown method ${method}`);
        }
        const FE = await getFlowerEvolver();
        const value = await FE[method](...args);
        self.postMessage({ jobType: 'result', id, value });
    }catch(err){
        self.postMessage({ jobType: 'error', id, error: err?.message ?? String(err) });
    }
};
