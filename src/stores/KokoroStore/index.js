import mitt from 'mitt';
import { defineStore } from 'pinia';
import WorkerManager from '../WorkerManager';
import kokoro from '../../workers/kokoro.worker?worker';
import { toRaw } from 'vue';
import { useErrorStore } from '../ErrorStore';

let channel = new mitt();
const wm = new WorkerManager(channel);
wm.addWorker('kokoro', kokoro());
wm.onError('kokoro', (e) => {
    const ErrorStore = useErrorStore();
    ErrorStore.push(e);
});
wm.onResponse('kokoro', (data) => {
    const KokoroStore = useKokoroStore();
    const jobType = data.jobType;
    switch(jobType){
        case "updateBtnTitle":{
            KokoroStore.isModelLoaded = true;
            channel.emit('ChatBotWidget#ToEmitter', data);
        }
            break;
        case "error":{
            const ErrorStore = useErrorStore();
            ErrorStore.push(data.error);
        }
            break;
        case "updateProgressBar":{
            channel.emit('ChatBotWidget#ToEmitter', data);
        }
            break;
        case "audioResp":{
            KokoroStore.addAudio(data.text, data.audio);
            channel.emit('ChatBotWidget#audioResp', {
                audio: data.audio,
                text: data.text
            });
        }
            break;
    }
});
export const hashText = async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

export const STORAGE_KEY_KOKORO_MODEL_OPTIONS = "FlowerEvolverKokoroModelOptions";
export const STORAGE_KEY_KOKORO_REMOTE_OPTIONS = "FlowerEvolverKokoroRemoteOptions";
export const STORAGE_KEY_KOKORO_IS_LOCAL = "FlowerEvolverKokoroIsLocal";

export const useKokoroStore = defineStore('KokoroStore', {
    state: () => ({
        wm,
        channel,
        isModelLoaded: false,
        isLocal: JSON.parse(localStorage.getItem(STORAGE_KEY_KOKORO_IS_LOCAL) || JSON.stringify(true)),
        modelOptions: JSON.parse(localStorage.getItem(STORAGE_KEY_KOKORO_MODEL_OPTIONS) || JSON.stringify({
            host: "huggingface",
            model: "onnx-community/Kokoro-82M-v1.0-ONNX",
            device: "CPU",
            dtype: "q8",
            voice: "af_bella"
        })),
        oldModelOptions: null,
        remoteOptions: JSON.parse(localStorage.getItem(STORAGE_KEY_KOKORO_REMOTE_OPTIONS) || JSON.stringify({
            url: "http://localhost:8880",
            api_key: "sk-no-key-required",
            model: "kokoro",
            voice: "af_bella"
        })),
        audios: new Map()
    }),
    getters: {
        getAudios: (state) => {
            return state.audios;
        },
        hasModelLoaded: (state) => {
            return state.isModelLoaded;
        },
        hasModelOptionsChanged: (state) => {
            if(state.oldModelOptions === null) return true;
            return ((state.oldModelOptions.host !== state.modelOptions.host) ||
                    (state.oldModelOptions.model !== state.modelOptions.model) ||
                    (state.oldModelOptions.device !== state.modelOptions.device) ||
                    (state.oldModelOptions.dtype !== state.modelOptions.dtype) ||
                    (state.oldModelOptions.voice !== state.modelOptions.voice));
        }
    },
    actions: {
        async addAudio(text, audio){
            let hash = await hashText(text);
            this.audios.set(hash, audio);
        },
        async getAudio(text){
            let hash = await hashText(text);
            return this.audios.get(hash);
        },
        async clearAudios(){
            this.audios = new Map();
        },
        async requestAudioGen(text){
            if(this.isLocal){
                if(this.isModelLoaded){
                    this.wm.sendRequest('kokoro', {
                        jobType: "audioGen",
                        text: text
                    });
                }
            }else{
                this.wm.sendRequest('kokoro', {
                    jobType: "rAudioGen",
                    text: text,
                    remoteOptions: structuredClone(toRaw(this.remoteOptions))
                })
            }
        },
        async requestModelLoad(){
            if(this.isLocal){
                this.oldModelOptions = structuredClone(toRaw(this.modelOptions));
                this.wm.sendRequest('kokoro', {
                    jobType: "loadModel",
                    modelOptions: structuredClone(toRaw(this.modelOptions))
                });
            }else{
                fetch(this.remoteOptions.url + "/health")
                .then(response => {
                    if(!response.ok){
                        throw Error("health endpoint not available.");
                    }
                    response.json();
                })
                .then((server) => {
                    this.isModelLoaded = server.status === "ok";
                }) // it doesn't support /health, assume is ok (openAI, hf, etc)
                .catch((_) => this.isModelLoaded = true)
            }
        },
        async requestReset(){
            if(this.isLocal){
                return;
            }
            this.isModelLoaded = false;
            this.wm.sendRequest('kokoro', {
                jobType: "reset",
            });
        },
        async saveModelOptions(){
            localStorage.setItem(STORAGE_KEY_KOKORO_MODEL_OPTIONS, JSON.stringify(this.modelOptions));
        },
        async saveRemoteOptions(){
            localStorage.setItem(STORAGE_KEY_KOKORO_REMOTE_OPTIONS, JSON.stringify(this.remoteOptions));
        },
        async saveIsLocal(){
            localStorage.setItem(STORAGE_KEY_KOKORO_IS_LOCAL, this.isLocal);
        }
    }
});
