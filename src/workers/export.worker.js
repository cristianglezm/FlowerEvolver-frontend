/**
 * @brief export flowers for native app.
 * @param {String} type - all, favourites
 * @param {Number} batchSize how many flowers before adding to the database.
 * @param
 * @example
 * // start worker
 *   workers.exportWorker.postMessage({
 *       type: type,
 *       batchSize: store.settings.limit
 *   });
 * // worker will send
 * // update
 *   self.postMessage({
 *       ready: false,
 *       type: "favourites",
 *       progress: progress
 *   });
 * // when done
 *       self.postMessage({
 *           ready: true,
 *           type: "favourites",
 *           filedata: data // data is a json to export.
 *       });
 */
import { db } from  '../store/db';

self.onmessage = async (e) => {
    let type = e.data.type;
    let batchSize = e.data.batchSize;
    let data = {
        Generation: [],
    };
    if(!db.isOpen()){
        db.open();
    }
    if(type == "favourites"){
        let totalCount = await db.favourites.count();
        let totalBatches = Math.ceil(totalCount / batchSize);
        for(let batchIndex = 0; batchIndex < totalBatches; ++batchIndex){
            let ids = await db.favourites.offset(batchIndex * batchSize)
                                    .limit(batchSize).toArray();
            let flowers = await db.flowers.bulkGet(ids);
            let progress = batchIndex * batchSize + 1;
            flowers.forEach(f => {
                self.postMessage({
                    ready: false,
                    type: "favourites",
                    progress: progress
                });
                ++progress;
                let json = JSON.parse(f.genome);
                data.Generation.push(json.Flower);
            });
        }
        self.postMessage({
            ready: true,
            type: "favourites",
            filedata: data
        });
    }else if(type == "all"){
        let totalCount = await db.flowers.count();
        let totalBatches = Math.ceil(totalCount / batchSize);
        for(let batchIndex = 0; batchIndex < totalBatches; ++batchIndex){
            let flowers = await db.flowers.offset(batchIndex * batchSize)
                                    .limit(batchSize).toArray();
            let progress = batchIndex * batchSize + 1;
            flowers.forEach(f => {
                self.postMessage({
                    ready: false,
                    type: "all",
                    progress: progress
                });
                ++progress;
                let json = JSON.parse(f.genome);
                data.Generation.push(json.Flower);
            });
        }
        self.postMessage({
            ready: true,
            type: "all",
            filedata: data
        });
    }else{
        throw Error("invalid type: " + type + " - valid types: favourites or all");
    }
};