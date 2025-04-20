/**
 * @brief checks if GPU is available
 * @returns Boolean
 */
export const isGPUAvailable = () => {
    return !!navigator.gpu;
};
/**
 * @class ModelCache
 * @brief simple custom cache to use for transformers.js
 */
export class ModelCache{
    constructor(cacheName = 'transformers-cache'){
      this.cacheName = cacheName;
    }
    async match(request){
        const cache = await caches.open(this.cacheName);
        return cache.match(request);
    }
    async put(request, response){
        const cache = await caches.open(this.cacheName);
        return cache.put(request, response);
    }
};
/**
 * @brief converts dataURL to Blob
 * @param {String} dataURL 
 * @returns {Blob}
 */
export const dataURLToBlob = (dataURL) => {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);

    const ia = new Uint8Array(ab);
    for(let i = 0; i < byteString.length; ++i){
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
};
export default { isGPUAvailable, ModelCache, dataURLToBlob };