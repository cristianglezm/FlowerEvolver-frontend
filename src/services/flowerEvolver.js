import { FEService } from '@cristianglezm/flower-evolver-wasm';

let initPromise = null;

/**
 * Returns the single shared, initialized FEService instance for the main thread,
 * lazily creating it on first call.
 *
 */
export function getFlowerEvolver(){
    if(!initPromise){
        initPromise = (async () => {
            const fe = new FEService();
            await fe.init();
            return fe;
        })();
    }
    return initPromise;
}

/** Only for tests - forces a fresh instance on the next getFlowerEvolver() call. */
export function _resetFlowerEvolverForTests(){
    initPromise = null;
}
