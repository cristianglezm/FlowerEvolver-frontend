import { db } from  '../store/db';
import fe from '@cristianglezm/flower-evolver-wasm';

const updateFlowers = (flowers) => {
    db.flowers.bulkPut(flowers);
};

let FE;

self.onmessage = async (e) => {
    self.canvas = new OffscreenCanvas(128, 192);
    let params = e.data.params;
    let batchSize = e.data.batchSize;
    if(!FE){
        FE = await fe();
    }
    self.canvas.width = params.radius * 2;
    self.canvas.height = params.radius * 3;
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
