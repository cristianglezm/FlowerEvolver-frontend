import mitt from 'mitt';
import { defineStore } from 'pinia';
import { useFlowersStore } from '../index';
import WorkerManager from '../WorkerManager';
import captioner from '../../workers/captioner.worker?worker';

let channel = new mitt();
const wm = new WorkerManager(channel);
wm.addWorker('captioner', captioner());
wm.onError('captioner', (e) => {
    const store = useFlowersStore();
    store.errors.push({message: e });
});
wm.onResponse('captioner', (data) => {
    const store = useFlowersStore();
    const AIStore = useAIStore();
    const desc = {
        id: data.FlowerID,
        description: data.description,
    };
    if(data.isLocal){
        AIStore.localDescriptions.set(desc.id, desc.description);
        store.db.descriptions.add(desc);
    }else{
        AIStore.remoteDescriptions.set(desc.id, desc.description);
    }
    channel.emit('captioner#done', desc);
});

export const useAIStore = defineStore('AIStore', {
    state: () => ({
        wm: wm,
        channel: channel,
        remoteDescriptions: new Map(),
        localDescriptions: new Map()
    }),
    getters: {
        getLocalDescription: (state) => (id) => {
            return state.localDescriptions.get(id);
        },
        getRemoteDescription: (state) => (id) => {
            return state.remoteDescriptions.get(id);
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
                    FlowerID: Flower.id,
                    urlOrDataURL: Flower.image,
                    isLocal: Flower.isLocal
            });
        }
    }
});
