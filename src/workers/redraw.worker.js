/**
 * @brief redraw flowers with current parameters.
 * @param {Number} batchSize how many flowers before adding to the database.
 * @param {Object} params{ radius: Number, numLayers: Number, P: Number, bias: Number}
 * @example
 * // start worker
 *   workers.redrawWorker.postMessage({
 *       batchSize: FlowerStore.settings.limit,
 *       params: structuredClone(toRaw(params))
 *  });
 * // updates
 *   self.postMessage({
 *       progress: progress
 *   });
 */
import { db } from  '../stores/FlowerStore/db';
import { FEParams, FEService } from '@cristianglezm/flower-evolver-wasm';

const updateFlowers = (flowers) => {
    db.flowers.bulkPut(flowers);
};

let FE;

self.onmessage = async (e) => {
    let params = e.data.params;
    let batchSize = e.data.batchSize;
    if(!db.isOpen()){
        db.open();
    }
    if(!FE){
        FE = new FEService();
        await FE.init();
    }
    FE.setParams(new FEParams(params.radius, params.numLayers, params.P, params.bias));
    let totalCount = await db.flowers.count();
    let totalBatches = Math.ceil(totalCount / batchSize);
    for(let batchIndex = 0; batchIndex < totalBatches; ++batchIndex){
        let flowers = await db.flowers.offset(batchIndex * batchSize)
                                .limit(batchSize).toArray();
        let progress = batchIndex * batchSize + 1;
        for(const f of flowers){
            self.postMessage({
                progress: progress
            });
            ++progress;
            try{
                let flower = await FE.drawFlower(f.genome);
                f.image = flower.image;
            }catch(_){
                //console.error(_);
                console.error("redraw could not draw flower with id " + f.id);
                continue;
            }
        }
        updateFlowers(flowers);
    }
};
