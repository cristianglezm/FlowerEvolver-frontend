/**
 * @brief creates the garden flowers and sends the json to export them.
 * @param {Number} radius
 * @param {Number} numFlowers
 * @example
 *  // start worker
 *   worker.postMessage({
 *       numFlowers: numFlowers,
 *       radius: gardenRadius
 *   });
 * // worker will send these:
 * // when a flower is made
 *       self.postMessage({
 *           id: i,
 *           image: image,
 *           ready: false
 *       });
 * // when done
 *   self.postMessage({
 *       ready: true,
 *       garden: JSON.stringify(garden)
 *   });
 */

import fe from '@cristianglezm/flower-evolver-wasm';

let FE;

self.onmessage = async (e) => {
    let params = {
        radius: e.data.radius,
        numLayers: 3,
        P: 6.0,
        bias: 1.0
    };
    let numFlowers = e.data.numFlowers;
    self.canvas = new OffscreenCanvas(params.radius * 2, params.radius * 3);
    let garden = {
        Generation: []
    };
    if(!FE){
        FE = await fe();
    }
    for(let i=0;i<numFlowers;++i){
        try{
            let genome = FE.makeFlower(params.radius, params.numLayers, params.P, params.bias);
            garden.Generation.push(JSON.parse(genome).Flower);
            let image = await createImageBitmap(self.canvas);
            self.postMessage({
                id: i,
                image: image,
                ready: false
            });
        }catch(e){
            console.error(e);
            return;
        }
    }
    self.postMessage({
        ready: true,
        garden: JSON.stringify(garden)
    });
};
