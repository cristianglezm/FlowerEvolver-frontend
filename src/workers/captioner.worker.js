import { describe, Captioner } from '../store/AIStore/AI';

/**
 * @brief Processes an image URL/Data URL to generate a description of a flower, or loads model configurations as needed.
 * 
 * This Web Worker listens for messages from the main thread that either:
 *   - Requests a model load with new configuration options.
 *   - Requests image description generation for a given flower.
 * 
 * Based on the message type, the worker either loads a new model configuration or processes the image to generate a description.
 * It then sends relevant updates or the generated description back to the main thread.
 *
 * @param {String} jobType - "loadModel" || "describe"
 * @param {ModelOptions} modelOptions - options to load the model see example below
 * @param {String} urlOrDataURL - The URL or Data URL of the flower image to be described.
 * @param {Boolean} isLocal - A flag indicating whether the image is stored locally (true) or remotely (false).
 * @param {Number} FlowerID - A unique identifier for the flower image, used to associate responses with their original requests.
 *
 * @example
 * // Main thread sends a message to the worker to load a new model configuration
 * captionerWorker.postMessage({
 *     jobType: "loadModel",
 *     modelOptions: {
 *         host: "huggingface",
 *         model: "cristianglezm/ViT-GPT2-FlowerCaptioner-ONNX",
 *         device: "GPU",
 *         encoder: "q4",
 *         decoder: "q4"
 *     }
 * });
 *
 * // Main thread requests a description generation for a specific flower image
 * captionerWorker.postMessage({
 *     jobType: "describe",
 *     urlOrDataURL: 'https://backend.io/42.jpg',
 *     isLocal: false,
 *     FlowerID: 42
 * });
 *
 * // The worker processes the image and sends back a message with the description
 * self.postMessage({
 *     jobType: "descResult",
 *     FlowerID: 42,
 *     description: 'A flower with 6 petals that are wide and have a slight wave to their edges...',
 *     isLocal: false
 * });
 */
const hasModelOptionsChanged = (modelOptions) => {
    return ((Captioner.modelOptions.host !== modelOptions.host) ||
            (Captioner.modelOptions.model !== modelOptions.model) ||
            (Captioner.modelOptions.device !== modelOptions.device) ||
            (Captioner.modelOptions.encoder !== modelOptions.encoder) ||
            (Captioner.modelOptions.decoder !== modelOptions.decoder));
};
const loadModel = async (modelOptions) => {
    if(hasModelOptionsChanged(modelOptions)){
        await Captioner.reset();
    }
    Captioner.setModelOptions(modelOptions);
    Captioner.getInstance((data) => {
        switch(data.status){
          case "initiate":{
              let event = {
                status: "init",
                name: data.file,
                progress: 0,
                total: 100
              };
              self.postMessage({
                jobType: "updateProgressBar",
                eventName: "requestMultiProgressBar",
                event: event
              });
          }
            break;
          case "progress":{
              let event = {
                status: "update",
                name: data.file,
                progress: data.progress
              };
              self.postMessage({
                jobType: "updateProgressBar",
                eventName: "requestMultiProgressBar",
                event: event
              });
          }
            break;
          case "done":{
            self.postMessage({
                jobType: "updateBtnTitle",
                eventName: "ModelOptions#updateBtnTitle",
                event: ""
            });
          }
            break;
        }
    });
}

self.onmessage = async (e) => {
    const jobType = e.data.jobType;
    switch(jobType){
        case "loadModel":{
            loadModel(e.data.modelOptions);
        }
            break;
        case "describe":{
            const urlOrDataURL = e.data.urlOrDataURL;
            const isLocal = e.data.isLocal;
            const output = await describe(urlOrDataURL);
            self.postMessage({
                jobType: "descResult",
                FlowerID: e.data.FlowerID,
                description: output,
                isLocal: isLocal
            });
        }
            break;
    }
};
