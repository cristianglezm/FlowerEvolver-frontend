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
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { getFlowerEvolver } from '../services/flowerEvolver';

self.onmessage = async (e) => {
    let params = {
        radius: e.data.radius,
        numLayers: 3,
        P: 6.0,
        bias: 1.0
    };
    params.radius = Math.min(256, Math.max(params.radius, 4));
    let numFlowers = e.data.numFlowers;
    let garden = {
        Generation: []
    };
    const FE = await getFlowerEvolver();
    for(let i=0;i<numFlowers;++i){
        try{
            let flower;
            try{
                FE.setParams(new FEParams(params.radius, params.numLayers, params.P, params.bias));
                flower = await FE.makeFlower();
            }catch(_){
                //console.error(_);
                console.error("garden could not draw a flower");
                continue;
            }
            garden.Generation.push(JSON.parse(flower.genome).Flower);
            self.postMessage({
                id: i,
                image: flower.image,
                ready: false
            });
        }catch(e){
            console.error(e);
            continue;
        }
    }
    self.postMessage({
        ready: true,
        garden: JSON.stringify(garden)
    });
};
