/**
 * @brief import flowers from Flower.json, Generation.json and Session.json from native app (flowers are limited to 256px radius)
 * @param {Array || FileList} files the files to import flowers from.
 * @param {Boolean} toFavs if the flowers will be added to favourites
 * @param {Number} batchSize how many flowers before adding to the database.
 * @example
 * // start worker
 *     worker.postMessage({
 *       files: files,
 *       toFavs: false,
 *       batchSize: FlowerStore.settings.limit
 *   });
 * // worker will send these:
 * // starting processing file
 *   self.postMessage({
 *       type: "showProgress",
 *       title: "Importing Flower file: " + files[i].name,
 *       progress: 0,
 *       total: 1
 *   });
 * // update
 *   self.postMessage({
 *       type: "updateProgress",
 *       progress: 1,
 *   });
 * // done
 *   self.postMessage({
 *       type: "done",
 *   });
 */
import { db } from  '../stores/FlowerStore/db';
import { FEParams, FEService } from '@cristianglezm/flower-evolver-wasm';

let FE;

const addFlowers = async (flowers, toFavs) => {
    if(toFavs){
        let ids = await db.flowers.bulkAdd(flowers, { allKeys: true});
        db.favourites.bulkAdd(ids, ids);
    }else{
        await db.flowers.bulkAdd(flowers);
    }
};
const clamp = (val, min, max) => {
    return Math.min(max, Math.max(val, min));
}
const importFlower = async (self, json, toFavs) => {
    let flower = {};
    let params = json.Flower.petals;
    params.radius = clamp(params.radius, 4, 256);
    FE.setParams(new FEParams(params.radius, params.numLayers, params.P, params.bias));
    flower.genome = JSON.stringify(json);
    try{
        flower = await FE.drawFlower(flower.genome);
    }catch(_){
        //console.error(_);
        console.error("importer could not import flower");
        self.postMessage({
            type: "updateProgress",
            progress: 1,
        });
        return;
    }
    let id = await db.flowers.add(flower);
    if(toFavs){
        db.favourites.add(id, id);
    }
    self.postMessage({
        type: "updateProgress",
        progress: 1,
    });
};
const importGeneration = async (self, batchSize, json, toFavs) => {
    let flowers = [];
    let progress = 1;
    for(const f of json.Generation){
        let flower = {};
        let params = f.petals;
        params.radius = clamp(params.radius, 4, 256);
        FE.setParams(new FEParams(params.radius, params.numLayers, params.P, params.bias));
        flower.genome = JSON.stringify({ Flower: f});
        try{
            flower = await FE.drawFlower(flower.genome);
        }catch(_){
            //console.error(_);
            console.error("importer could not import flower " + (progress - 1));
            self.postMessage({
                type: "updateProgress",
                progress: progress,
            });
            ++progress;
            continue;
        }
        flowers.push(flower);
        if(flowers.length >= batchSize){
            await addFlowers(flowers, toFavs);
            flowers = [];
        }
        self.postMessage({
            type: "updateProgress",
            progress: progress,
        });
        ++progress;
    }
    // add flowers outside of batch
    if(flowers.length > 0){
        await addFlowers(flowers, toFavs);
    }
};
const importSession = async (self, batchSize, json, toFavs) => {
    let flowers = [];
    let progress = 1;
    for(const g of json.Session.generations){
        for(const f of g){
            let flower = {};
            let params = f.petals;
            params.radius = clamp(params.radius, 4, 256);
            FE.setParams(new FEParams(params.radius, params.numLayers, params.P, params.bias));
            flower.genome = JSON.stringify({ Flower: f});
            try{
                flower = await FE.drawFlower(flower.genome);
            }catch(_){
                //console.error(_);
                console.error("importer could not import flower " + (progress - 1));
                self.postMessage({
                    type: "updateProgress",
                    progress: progress,
                });
                ++progress;
                continue;
            }
            flowers.push(flower);
            if(flowers.length >= batchSize){
                await addFlowers(flowers, toFavs);
                flowers = [];
            }
            self.postMessage({
                type: "updateProgress",
                progress: progress,
            });
            ++progress;
        }
    }
    // add flowers outside of batch
    if(flowers.length > 0){
        await addFlowers(flowers, toFavs);
    }
};

self.onmessage = async (e) => {
    let files = e.data.files;
    let batchSize = e.data.batchSize;
    let toFavs = e.data.toFavs;
    if(!db.isOpen()){
        db.open();
    }
    if(!FE){
        FE = new FEService();
        await FE.init();
    }
    let fr = new FileReaderSync();
    for(let i=0;i<files.length;++i){
        if(files[i].type != 'application/json'){
            continue;
        }
        let json = {};
        {
            let text = await fr.readAsText(files[i]);
            json = JSON.parse(text);
        }
        if(Object.hasOwn(json, "Flower")){
            self.postMessage({
                type: "showProgress",
                title: "Importing Flower file: " + files[i].name,
                progress: 0,
                total: 1
            });
            await importFlower(self, json, toFavs);
        }else if(Object.hasOwn(json, "Generation")){
            self.postMessage({
                type: "showProgress",
                title: "Importing Generation file: " + files[i].name,
                progress: 0,
                total: json.Generation.length
            });
            await importGeneration(self, batchSize, json, toFavs);
        }else if(Object.hasOwn(json, "Session")){
            let total = json.Session.generations.reduce((acc, gen) => acc + gen.length, 0);
            self.postMessage({
                type: "showProgress",
                title: "Importing Session file: " + files[i].name,
                progress: 0,
                total: total
            });
            await importSession(self, batchSize, json, toFavs);
        }
    }
    self.postMessage({
        type: "done",
    });
};
