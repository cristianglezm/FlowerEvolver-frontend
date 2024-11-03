import { pipeline, env } from '@huggingface/transformers';

env.userBrowserCache = true;
const BACKEND = import.meta.env.VITE_APP_DOWNLOAD_URL;

export const isGPUAvailable = () => {
    return !!navigator.gpu;
};

export class Captioner{
    static task = 'image-to-text';
    static modelOptions = {
        host: "huggingface",
        model: "cristianglezm/ViT-GPT2-FlowerCaptioner-ONNX",
        device: "CPU",
        encoder: "q8",
        decoder: "q8"
    };
    static instance = null;
    static setModelOptions(modelOptions){
        this.modelOptions = modelOptions;
    }
    static async getInstance(progress_callback = null){
        if(this.instance === null){
            if(this.modelOptions.host === 'localhost'){
                env.localModelPath = 'http://localhost/';
                env.allowLocalModels = true;
                env.allowRemoteModels = false;
            }else{
                env.localModelPath = '/models/';
                env.allowLocalModels = false;
                env.allowRemoteModels = true;
            }
            this.instance = pipeline(this.task, this.modelOptions.model,
            {
                dtype: {
                    encoder_model: this.modelOptions.encoder,
                    decoder_model_merged: this.modelOptions.decoder,
                },
                device: this.modelOptions.device === "CPU" ? "wasm":"webgpu",
                progress_callback
            });
        }
        return this.instance;
    }
    static hasModelLoaded(){
        return this.instance !== null;
    }
    static async reset(){
        if(this.hasModelLoaded()){
            (await this.getInstance()).dispose();
            this.instance = null;
        }
    }
}

const dataURLToBlob = (dataURL) => {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);

    const ia = new Uint8Array(ab);
    for(let i = 0; i < byteString.length; ++i){
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

export const describe = async (image) => {
    let url = '';
    if(image.includes('data')){
        const blob = dataURLToBlob(image);
        url = URL.createObjectURL(blob);
    }else{
        url = BACKEND + image;
    }
    let captioner = await Captioner.getInstance();
    const output = await captioner(url);
    return output[0].generated_text;
}

export default { isGPUAvailable, Captioner, describe };
