import { env } from '@huggingface/transformers';
import { HfInference } from '@huggingface/inference';
import { KokoroTTS, TextSplitterStream } from "kokoro-js";
import { ModelCache, isGPUAvailable } from '../AIUtils';

// @todo replace with 'fe-kokoro-cache' when able to use custom cache.
export const CACHE_KEY = 'transformers-cache';
export const VOICES_CACHE_KEY = 'kokoro-voices';
export { isGPUAvailable };

/**
 * @class Kokoro
 * @brief A singleton class that manages the Kokoro instance for audio generation tasks.
 */
export class Kokoro{
    static modelOptions = {
        host: "huggingface",
        model: "onnx-community/Kokoro-82M-v1.0-ONNX",
        device: "CPU",
        dtype: "q8",
        voice: "af_bella"
    };
    static instance = null;
    /**
     * @brief Updates the model configuration options.
     * @param {Object} modelOptions - Custom options to set the model configuration.
     * @default
     * const modelOptions = {
     *      host: "huggingface",
     *      model: "onnx-community/Kokoro-82M-v1.0-ONNX",
     *      device: "CPU",
     *      dtype: "q8",
     *      voice: "af_bella"
     * };
     */
    static setModelOptions(modelOptions){
        this.modelOptions = modelOptions;
    }
    /**
     * @brief Retrieves the chatbot instance or initializes it if not already loaded.
     * @param {Function|null} progress_callback - A callback function for reporting progress.
     * @returns {Promise<Object>} - The initialized chatbot instance.
     */
    static async getInstance(progress_callback = null){
        if(this.instance === null){
            env.useBrowserCache = false;
            env.useCustomCache = true;
            env.customCache = new ModelCache(CACHE_KEY);
            if(this.modelOptions.host === 'localhost'){
                env.localModelPath = 'http://localhost/';
                env.allowLocalModels = true;
                env.allowRemoteModels = false;
            }else{
                env.localModelPath = '/models/';
                env.allowLocalModels = false;
                env.allowRemoteModels = true;
            }
            this.instance = KokoroTTS.from_pretrained(this.modelOptions.model,
            {
                dtype: this.modelOptions.dtype,
                device: this.modelOptions.device === "CPU" ? "wasm":"webgpu",
                progress_callback
            });
        }
        return this.instance;
    }
    /**
     * @brief Checks if the kokoro model has already been loaded.
     * @returns {Boolean} - True if the model is loaded; otherwise, false.
     */
    static hasModelLoaded(){
        return this.instance !== null;
    }
    /**
     * @brief Resets and disposes of the kokoro instance.
     */
    static async reset(){
        if(this.hasModelLoaded()){
            // (await this.getInstance()).dispose();
            this.instance = null;
        }
    }
};
/**
 * @brief Generates audio from text using Kokoro.
 *
 * @param {string} text - The text to be converted to speech.
 *
 * @returns {Promise<Object>} - The generated audio.
 */
export const audioGen = async (text) => {
    let tts = await Kokoro.getInstance();
    let audio = await tts.generate(text, {
        voice: Kokoro.modelOptions.voice,
    });
    return audio;
};
/**
 * @brief Generates audio from text(splits the text and streams the chunks) using Kokoro.
 *
 * @param {Function} callback
 * @param {TextSplitterStream} splitter
 * @param {AsyncGenerator} stream
 */
export const streamingAudioGen = async (callback) => {
    let tts = await Kokoro.getInstance();
    const splitter = new TextSplitterStream();
    const stream = tts.stream(splitter, {
        voice: Kokoro.modelOptions.voice
    });
    callback(splitter, stream);
};
/**
 * @brief Generates audio from text using remote text-to-speech (TTS) service.
 *
 * @param {string} text - The text to be converted to speech.
 * @param {Object} [remoteOptions] - Configuration options for the remote TTS service.
 * @param {string} [remoteOptions.url="http://localhost:8880"] - The base URL of the remote TTS service.
 * @param {string} [remoteOptions.api_key="sk-no-key-required"] - The API key for the remote TTS service.
 * @param {string} [remoteOptions.model="kokoro"] - The TTS model to be used.
 * @param {string} [remoteOptions.voice="af_bella"] - The voice to be used.
 * 
 * @returns {Promise<Blob>} - The generated audio as a Blob.
 */
export const rAudioGen = async (text, remoteOptions = {
    url: "http://localhost:8880",
    api_key: "sk-no-key-required",
    model: "kokoro",
    voice: "af_bella"
}) => {
    const fullUrl = remoteOptions.url + "/v1/audio/speech";
    const hf = new HfInference(remoteOptions.api_key).endpoint(fullUrl);
    let audio = await hf.textToSpeech({
        "model": remoteOptions.model,
        "input": text,
        "voice": remoteOptions.voice,
        "stream": true,
        "speed": 1.0,
        "response_format": "wav",
        "lang_code": "a",
        "return_download_link": false
    });
    return audio;
};
