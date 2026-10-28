import SpeciesWorker from '../workers/species.worker?worker';
import { SpeciesClient } from './SpeciesClient';

let client = null;

/**
 * Returns the single SpeciesClient of the main thread, lazily creating it, and the worker with its own
 * wasm instance behind it, on first call.
 */
export function getSpeciesClient(){
    if(client === null){
        client = SpeciesClient.fromWorker(new SpeciesWorker());
    }
    return client;
}

/** Only for tests - forces a fresh client on the next getSpeciesClient() call. */
export function _resetSpeciesClientForTests(){
    client = null;
}
