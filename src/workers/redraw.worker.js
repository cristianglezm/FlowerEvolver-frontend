import { db } from  '../store/db';
import fe from '@cristianglezm/flower-evolver-wasm';

const updateFlowers = (flowers) => {
    db.flowers.bulkPut(flowers);
};
/// @todo fix OOM error when in development.
self.onmessage = async (e) => {
    self.canvas = e.data.canvas;
    let params = e.data.params;
    self.canvas.width = params.radius * 2;
    self.canvas.height = params.radius * 3;
    let FE = await fe();
    let batchSize = 100;
    let totalCount = await db.flowers.count();
    let totalBatches = Math.ceil(totalCount / batchSize);
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++){
        let flowers = await db.flowers.offset(batchIndex * batchSize)
                                .limit(batchSize).toArray();
        let progress = batchIndex * batchSize + 1;
        for(const f of flowers){
            self.postMessage({
                progress: progress
            });
            ++progress;
            try{
                FE.drawFlower(f.genome, params.radius, params.numLayers, params.P, params.bias);
            }catch(e){
                continue;
            }
            let blob = await self.canvas.convertToBlob();
            let frs = await new FileReaderSync();
            f.image = await frs.readAsDataURL(blob);
        }
        updateFlowers(flowers);
    }
};
