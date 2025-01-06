import mitt from 'mitt';
import { defineStore } from 'pinia';
import { useFlowerStore } from '../FlowerStore';
import WorkerManager from '../WorkerManager';
import chatbot from '../../workers/chatbot.worker?worker';
import { toRaw } from 'vue';

let channel = new mitt();
const wm = new WorkerManager(channel);
wm.addWorker('chatbot', chatbot());
wm.onError('chatbot', (e) => {
    const FlowerStore = useFlowerStore();
    FlowerStore.errors.push({message: e });
});
wm.onResponse('chatbot', (data) => {
    const chatbotStore = useChatBotStore();
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
        case "response":{
            let last = data.response[0].generated_text.length
            let message = data.response[0].generated_text[last - 1];
            let result = chatbotStore.executor(message.content);
            for(const toConfirm of result.commandsToConfirm.values()){
                channel.emit('ChatBotWidget#ConfirmModal', toConfirm);
            }
            let text = "";
            for(const msg of result.textForUser.values()){
                text += "\n" + msg;
            }
            chatbotStore.addMessage(message.role, text);
        }
            break;
        case "streaming":{
            channel.emit('ChatBotWidget#stream', data.response);
        }
            break;
        case "done":{
            channel.emit('ChatBotWidget#done');
        }
            break;
    }
});

export const STORAGE_KEY_CHATBOT_MODEL_OPTIONS = "FlowerEvolverChatBotModelOptions";

export const useChatBotStore = defineStore('ChatBotStore', {
    state: () => ({
        wm,
        channel,
        isModelLoaded: false,
        modelOptions: JSON.parse(localStorage.getItem(STORAGE_KEY_CHATBOT_MODEL_OPTIONS) || JSON.stringify({
            host: "huggingface",
            model: "HuggingFaceTB/SmolLM2-135M-Instruct",
            device: "CPU",
            dtype: "q4"
        })),
        oldModelOptions: null,
        chatHistory: [],
        id: 0,
        executor: () => {}
    }),
    getters: {
        getChatHistory: (state) => () => {
            return state.chatHistory;
        },
        hasModelLoaded: (state) => () => {
            return state.isModelLoaded;
        },
        hasModelOptionsChanged: (state) => () => {
            if(state.oldModelOptions === null) return true;
            return ((state.oldModelOptions.host !== state.modelOptions.host) ||
                    (state.oldModelOptions.model !== state.modelOptions.model) ||
                    (state.oldModelOptions.device !== state.modelOptions.device) ||
                    (state.oldModelOptions.dtype !== state.modelOptions.dtype));
        }
    },
    actions: {
        async addMessage(role, message){
            this.chatHistory.push({
                "id": this.id,
                "role": role,
                "content": message
            });
            ++this.id;
        },
        async clearMessages(){
            this.chatHistory = [];
            this.id = 0;
        },
        async requestChat({chat_template = null, tools = null, documents = null}){
            this.wm.sendRequest('chatbot', {
                jobType: "chat",
                messages: structuredClone(toRaw(this.chatHistory)),
                chat_template,
                tools,
                documents
            });
        },
        async requestStreamingChat({chat_template = null, tools = null, documents = null}){
            this.wm.sendRequest('chatbot', {
                jobType: "streaming",
                messages: structuredClone(toRaw(this.chatHistory)),
                chat_template,
                tools,
                documents
            });
        },
        async requestRegenerate(id, {chat_template = null, tools = null, documents = null}){
            this.chatHistory.splice(id, this.chatHistory.length);
            this.id = id;
            this.wm.sendRequest('chatbot', {
                jobType: "streaming",
                messages: structuredClone(toRaw(this.chatHistory)),
                chat_template,
                tools,
                documents
            });
        },
        async requestModelLoad(){
            this.oldModelOptions = structuredClone(toRaw(this.modelOptions));
            this.isModelLoaded = false;
            this.wm.sendRequest('chatbot', {
                jobType: "loadModel",
                modelOptions: structuredClone(toRaw(this.modelOptions))
            });
            this.isModelLoaded = true;
        },
        async requestReset(){
            this.wm.sendRequest('chatbot', {
                jobType: "reset",
            });
        },
        async saveModelOptions(){
            localStorage.setItem(STORAGE_KEY_CHATBOT_MODEL_OPTIONS, JSON.stringify(this.modelOptions));
        }
    }
});
