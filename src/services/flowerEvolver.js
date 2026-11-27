import { FEService, FEParams } from '@cristianglezm/flower-evolver-wasm';

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

/**
 * What the wasm keeps of the params of a flower. It limits them (the radius, the layers) and says which it kept in the
 * petals of what it makes, so that is what is asked: the params that are given are set, a flower is made, and the petals
 * of its genome are what the wasm kept. Nothing of the flower is used (it has new random dna), and the evolver is left
 * with the params that it had. The limits are the wasm's, they are not repeated anywhere else.
 */
export async function keptPetals(params){
    const fe = await getFlowerEvolver();
    const before = fe.getParams();
    try{
        fe.setParams(new FEParams(params.radius, params.numLayers, params.P, params.bias));
        const { radius, numLayers, P, bias } = JSON.parse((await fe.makePetals()).genome).Flower.petals;
        return { radius, numLayers, P, bias };
    }finally{
        if(before){
            fe.setParams(before);
        }
    }
}

/** Only for tests - forces a fresh instance on the next getFlowerEvolver() call. */
export function _resetFlowerEvolverForTests(){
    initPromise = null;
}
