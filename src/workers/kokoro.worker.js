import { TextSplitterStream } from 'kokoro-js';
import { Kokoro, audioGen, rAudioGen, streamingAudioGen } from '../stores/KokoroStore/Kokoro';

/**
 * @brief Web Worker that manages tasks related to loading a Kokoro model, resetting it, and processing text to audio.
 * 
 * This Web Worker listens for messages from the main thread, processes various tasks, and sends relevant updates or responses back.
 * The worker handles tasks such as:
 *   - Loading a new Kokoro model with specific configuration options.
 *   - Resetting the Kokoro instance.
 *   - Handling text to audio generation.
 * 
 * Based on the received message type, the worker either loads a model, resets the model, or processes a the text message using the model.
 * It reports progress and completion events back to the main thread, as well as the audio responses.
 * 
 * The worker uses the `Kokoro` class to manage model loading, resetting, and audio generation. It also reports progress via `postMessage` to update the UI.
 * 
 * @param {String} e.data.jobType - The type of job requested by the main thread. Possible values:
 *   - `"loadModel"`: Load the model with new configuration options.
 *   - `"reset"`: Reset the chatbot model and clear its state.
 *   - `"audioGen"`: generate audio for 'text'
 *   - `"rAudioGen"': generate audio for 'text' in the configured remote server.
 *   - `"streamingAudio"`: Generate audio for a given 'text' by splitting it into chunks and processing each chunk locally to audio.
 *   - `"rStreamingAudio"`: Generate audio for a given 'text' by splitting it into chunks and sending each chunk to a remote server for audio processing.
 * 
 * @param {Object} e.data.modelOptions - Configuration options for the model (only for the `"loadModel"` job type).
 *   @property {String} host - The host for the model (e.g., `"huggingface"` or `"localhost"`).
 *   @property {String} model - The model identifier (e.g., `"onnx-community/Kokoro-82M-ONNX"`).
 *   @property {String} device - The device for running the model (e.g., `"CPU"`).
 *   @property {String} dtype - The data type for the model (e.g., `"q4"`).
 *   @property {String} voice - the voice to use when generating the audio (e.g., `"af_bella"`)
 * 
 * @param {String} e.data.text - the text to make an audio for
 *
 * @example
 * // Send a message to the worker to load a model
 * KokoroWorker.postMessage({
 *   jobType: "loadModel",
 *   modelOptions: {
 *     host: "huggingface",
 *     model: "onnx-community/Kokoro-82M-ONNX",
 *     device: "CPU",
 *     dtype: "q4",
 *     voice: "af_bella"
 *   }
 * });
 * 
 * // Send a message to the worker for a chat response
 * KokoroWorker.postMessage({
 *   jobType: "audioGen",
 *   text: text
 * });
 * // the worker will respond with a jobType of "audioResp" for the audio generated
 *          self.postMessage({
 *            jobType:"audioResp",
 *            response: audio
 *          });
 * // in case of error it will respond with this
 *          self.postMessage({
 *            jobType:"error",
 *            error: error
 *          });
 */

/**
 * @brief Compares the provided model options with the current model options to check for changes.
 * @param {Object} modelOptions - The model options to compare.
 * @param {String} modelOptions.host - The host URL or identifier.
 * @param {String} modelOptions.model - The model identifier.
 * @param {String} modelOptions.device - The device where the model will run (e.g., "CPU").
 * @param {String} modelOptions.dtype - The data type used by the model (e.g., "q4").
 * @param {String} modelOptions.voice - The voice type used by the model (e.g. "af_bella").
 * @returns {Boolean} - Returns true if the model options have changed, false otherwise.
 */
const hasModelOptionsChanged = (modelOptions) => {
    return ((Kokoro.modelOptions.host !== modelOptions.host) ||
            (Kokoro.modelOptions.model !== modelOptions.model) ||
            (Kokoro.modelOptions.device !== modelOptions.device) ||
            (Kokoro.modelOptions.dtpe !== modelOptions.dtype) ||
            Kokoro.modelOptions.voice !== modelOptions.voice);
};
/**
 * @brief Loads the model with the specified options. If the model options have changed, it resets the chatbot instance.
 *        This function also handles progress reporting and communication with the worker thread.
 * @param {Object} modelOptions - The new model options to use.
 * @param {String} modelOptions.host - The host URL or identifier.
 * @param {String} modelOptions.model - The model identifier.
 * @param {String} modelOptions.device - The device where the model will run (e.g., "CPU").
 * @param {String} modelOptions.dtype - The data type used by the model (e.g., "q4").
 * @param {String} modelOptions.voice - The voice type used by the model (e.g. "af_bella").
 */
const loadModel = async (modelOptions) => {
    if(hasModelOptionsChanged(modelOptions)){
        await Kokoro.reset();
    }
    Kokoro.setModelOptions(modelOptions);
    Kokoro.getInstance((data) => {
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
                eventName: "ChatBotWidget#requestMultiProgressBar",
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
                eventName: "ChatBotWidget#requestMultiProgressBar",
                event: event
              });
          }
            break;
          case "done":{
            self.postMessage({
                jobType: "updateBtnTitle",
                eventName: "ChatBotModelOptions#updateBtnTitle",
                event: ""
            });
          }
            break;
        }
    });
}

const _audioGen = async (e) => {
    const text = e.data.text;
    let audio = await audioGen(text);
    const blob = await audio.toBlob({ type: 'audio/wav' });
    self.postMessage({
        jobType: "audioResp",
        audio: URL.createObjectURL(blob),
        text: text
    });
};
const _streamingAudioGen = async (e) => {
    const fullText = e.data.text;
    streamingAudioGen(async (splitter, stream) => {
        splitter.push(fullText);
        splitter.close();
        for await(const { text, _, audio } of stream){
            const blob = audio.toBlob({type: 'audio/wav'});
            self.postMessage({
                jobType: "streamingAudioChunk",
                audio: URL.createObjectURL(blob),
                text: text
            });
        }
        self.postMessage({
            jobType: "streamingAudioChunk#done",
            text: fullText
        });
    });
};
const _rStreamingAudioGen = async (e) => {
    const fullText = e.data.text;
    const remoteOptions = e.data.remoteOptions;
    let splitter = new TextSplitterStream();
    splitter.push(fullText);
    splitter.close();
    for await(const text of splitter){
        let blob = await rAudioGen(text, remoteOptions);
        self.postMessage({
            jobType: "streamingAudioChunk",
            audio: URL.createObjectURL(blob),
            text: text
        });
    }
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(200);
    self.postMessage({
        jobType: "streamingAudioChunk#done",
        text: fullText
    });
};
const _rAudioGen = async (e) => {
    const text = e.data.text;
    const remoteOptions = e.data.remoteOptions;
    let blob = await rAudioGen(text, remoteOptions);
    self.postMessage({
        jobType: "audioResp",
        audio: URL.createObjectURL(blob),
        text: text
    });
};
self.onmessage = async (e) => {
    const jobType = e.data.jobType;
    switch(jobType){
        case "loadModel":{
          try{
                loadModel(e.data.modelOptions);
          }catch(e){
                self.postMessage({
                jobType: "error",
                error: e
                });
          }
        }
            break;
        case "reset":{
            try{
                await Kokoro.reset();
            }catch(e){
                self.postMessage({
                  jobType: "error",
                  error: e
                });
            }
        }
            break;
        case "audioGen":{
            try{
                _audioGen(e);
            }catch(e){
                self.postMessage({
                  jobType: "error",
                  error: e
                });
            }
        }
            break;
        case "streamingAudio":{
            try{
                _streamingAudioGen(e);
            }catch(e){
                self.postMessage({
                    jobType: "error",
                    error: e
                });
            }
        }
            break;
        case "rAudioGen":{
            try{
                _rAudioGen(e);
            }catch(e){
                self.postMessage({
                  jobType: "error",
                  error: e
                });
            }
        }
            break;
        case "rStreamingAudio":{
            try{
                _rStreamingAudioGen(e);
            }catch(e){
                self.postMessage({
                    jobType: "error",
                    error: e
                });
            }
        }
            break;
    }
};
