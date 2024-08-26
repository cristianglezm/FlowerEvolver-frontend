import { pipeline, env } from '@xenova/transformers';

env.userBrowserCache = true;
env.allowLocalModels = false;

const BACKEND = import.meta.env.VITE_APP_DOWNLOAD_URL;

export class Captioner{
    static task = 'image-to-text';
    static model = 'cristianglezm/ViT-GPT2-FlowerCaptioner-ONNX';
    static instance = null;

    static async getInstance(progress_callback = null){
        if(this.instance === null){
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
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

export default { Captioner, describe };
