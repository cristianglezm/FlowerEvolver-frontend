import mitt from 'mitt';
import { defineStore } from 'pinia';
import { useFlowersStore } from '../index';
import WorkerManager from '../WorkerManager';
import captioner from '../../workers/captioner.worker?worker';
import { toRaw } from 'vue';

let channel = new mitt();
const wm = new WorkerManager(channel);
wm.addWorker('captioner', captioner());
wm.onError('captioner', (e) => {
    const store = useFlowersStore();
    store.errors.push({message: e });
});
wm.onResponse('captioner', (data) => {
    const store = useFlowersStore();
    const CaptionerStore = useCaptionerStore();
    const jobType = data.jobType;
    switch(jobType){
        case "updateBtnTitle":{
            channel.emit('App#ToEmitter', data);
        }
            break;
        case "updateProgressBar":{
            channel.emit('App#ToEmitter', data);
        }
            break;
        case "descResult":{
            const desc = {
                id: data.FlowerID,
                description: data.description,
            };
            if(data.isLocal){
                CaptionerStore.localDescriptions.set(desc.id, desc.description);
                store.db.descriptions.add(desc);
            }else{
                CaptionerStore.remoteDescriptions.set(desc.id, desc.description);
            }
            channel.emit('captioner#done', desc);
        }
            break;
    }
});

export const STORAGE_KEY_CAPTIONER_MODEL_OPTIONS = "FlowerEVolverCaptionerModelOptions";
export const useCaptionerStore = defineStore('CaptionerStore', {
    state: () => ({
        wm,
        channel,
        isModelLoaded: false,
        remoteDescriptions: new Map(),
        localDescriptions: new Map(),
        modelOptions: JSON.parse(localStorage.getItem(STORAGE_KEY_CAPTIONER_MODEL_OPTIONS) || JSON.stringify({
            host: "huggingface",
            model: "cristianglezm/ViT-GPT2-FlowerCaptioner-ONNX",
            device: "CPU",
            encoder: "q8",
            decoder: "q8"
        })),
        oldModelOptions: null
    }),
    getters: {
        getLocalDescription: (state) => (id) => {
            return state.localDescriptions.get(id);
        },
        getRemoteDescription: (state) => (id) => {
            return state.remoteDescriptions.get(id);
        },
        hasModelLoaded: (state) => () => {
            return state.isModelLoaded;
        },
        hasModelOptionsChanged: (state) => () => {
            if(state.oldModelOptions === null) return true;
            return ((state.oldModelOptions.host !== state.modelOptions.host) ||
                    (state.oldModelOptions.model !== state.modelOptions.model) ||
                    (state.oldModelOptions.device !== state.modelOptions.device) ||
                    (state.oldModelOptions.encoder !== state.modelOptions.encoder) ||
                    (state.oldModelOptions.decoder !== state.modelOptions.decoder));
        }
    },
    actions: {
        async loadLocalDescriptions(offset, limit){
            this.localDescriptions = new Map();
            const store = useFlowersStore();
            store.db.descriptions.offset(offset).limit(limit).toArray()
            .then((descriptions) => {
                descriptions.forEach((desc) => {
                    this.localDescriptions.set(desc.id, desc.description);
                });
            })
            .catch((e) => {
                store.errors.push({ message: e });
            });
        },
        async loadAndConcatLocalDescriptions(offset, limit){
            const store = useFlowersStore();
            let newMap = new Map();
            store.db.descriptions.offset(offset).limit(limit).toArray()
            .then((descriptions) => {
                descriptions.forEach((desc) => {
                    newMap.set(desc.id, desc.desciption);
                });
                this.localDescriptions = new Map([this.localDescriptions, newMap]);
            })
            .catch((e) => {
                store.errors.push({ message: e });
            });
        },
        async requestDescription(Flower){
            this.wm.sendRequest('captioner', {
                jobType: "describe",
                FlowerID: Flower.id,
                urlOrDataURL: Flower.image,
                isLocal: Flower.isLocal
            });
        },
        async requestModelLoad(){
            this.oldModelOptions = structuredClone(toRaw(this.modelOptions))
            this.isModelLoaded = false;
            this.wm.sendRequest('captioner', {
                jobType: "loadModel",
                modelOptions: structuredClone(toRaw(this.modelOptions))
            });
            this.isModelLoaded = true;
        },
        async saveModelOptions(){
            localStorage.setItem(STORAGE_KEY_CAPTIONER_MODEL_OPTIONS, JSON.stringify(this.modelOptions));
        }
    }
});
