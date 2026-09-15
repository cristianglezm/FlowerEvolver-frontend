import mitt from 'mitt';
import { defineStore } from 'pinia';
import WorkerManager from '../WorkerManager';
import chatbot from '../../workers/chatbot.worker?worker';
import { toRaw } from 'vue';
import { useErrorStore } from '../ErrorStore';

let channel = new mitt();
const wm = new WorkerManager(channel);
wm.addWorker('chatbot', chatbot());
wm.onError('chatbot', (e) => {
    const ErrorStore = useErrorStore();
    ErrorStore.push(e);
});
wm.onResponse('chatbot', (data) => {
    const chatbotStore = useChatBotStore();
    const jobType = data.jobType;
    switch(jobType){
        case "updateBtnTitle":{
            chatbotStore.isModelLoaded = true;
            channel.emit('ChatBotWidget#ToEmitter', data);
        }
            break;
        case "error":{
            const ErrorStore = useErrorStore();
            ErrorStore.push(data.error);
            /// pending message done
            channel.emit('ChatBotWidget#done');
        }
            break;
        case "updateProgressBar":{
            channel.emit('ChatBotWidget#ToEmitter', data);
        }
            break;
        case "response":{
            let message = {};
            if(chatbotStore.isLocal){
                let last = data.response[0].generated_text.length;
                message = data.response[0].generated_text[last - 1];
            }else{
                message.role = "assistant";
                message.content = data.response;
            }
            let result = chatbotStore.executor(message.content);
            for(const toConfirm of result.commandsToConfirm.values()){
                channel.emit('ChatBotWidget#ConfirmModal', toConfirm);
            }
            let text = "";
            for(const msg of result.textForUser.values()){
                text += "\n" + msg;
            }
            if(text !== ""){
                chatbotStore.addMessage(message.role, text);
            }
            let info = "";
            for(const msg of result.infoForUser.values()){
                info += "\n" + msg;
            }
            if(info !== ""){
                chatbotStore.addMessage("info", info);
            }
        }
            break;
        case "streaming":{
            channel.emit('ChatBotWidget#stream', data.response);
        }
            break;
        case "embeddings":{
            let type = data.type;
            let embeddings = data.embeddings;
            let text = data.text;
            switch(type){
                case "user":{
                    channel.emit('ChatBotWidget#userEmbeddings', {
                        text: text,
                        embeddings: embeddings
                    });
                }
                    break;
                case "document":{
                    channel.emit('ChatBotWidget#documentEmbeddings', {
                        text: text,
                        embeddings: embeddings
                    });
                }
                    break;
                case "tool":{
                    channel.emit('ChatBotWidget#toolEmbeddings', {
                        text: text,
                        embeddings: embeddings
                    });
                }
                    break;
            }
        }
            break;
        case "done":{
            channel.emit('ChatBotWidget#done');
        }
            break;
    }
});

export const STORAGE_KEY_CHATBOT_MODEL_OPTIONS = "FlowerEvolverChatBotModelOptions";
export const STORAGE_KEY_CHATBOT_REMOTE_OPTIONS = "FlowerEvolverChatBotRemoteOptions";
export const STORAGE_KEY_CHATBOT_IS_LOCAL = "FlowerEvolverChatBotIsLocal";

export const useChatBotStore = defineStore('ChatBotStore', {
    state: () => ({
        wm,
        channel,
        isModelLoaded: false,
        isLocal: JSON.parse(localStorage.getItem(STORAGE_KEY_CHATBOT_IS_LOCAL) || JSON.stringify(true)),
        modelOptions: JSON.parse(localStorage.getItem(STORAGE_KEY_CHATBOT_MODEL_OPTIONS) || JSON.stringify({
            host: "huggingface",
            model: "HuggingFaceTB/SmolLM2-135M-Instruct",
            device: "CPU",
            dtype: "q4"
        })),
        oldModelOptions: null,
        remoteOptions: JSON.parse(localStorage.getItem(STORAGE_KEY_CHATBOT_REMOTE_OPTIONS) || JSON.stringify({
            url: "http://localhost:8080",
            api_key: "sk-no-key-required",
            model: "HuggingFaceTB/SmolLM2-135M-Instruct",
            max_tokens: 256,
            top_k: 40,
            top_p: 0.95,
            min_p: 0.05,
            temperature: 0.8
        })),
        chatHistory: [],
        executor: (content) => { return {textForUser: [content], commandsToConfirm: []}; }
    }),
    getters: {
        getChatHistory: (state) => {
            return state.chatHistory;
        },
        getLastMessage: (state) => () => {
            let size = state.chatHistory.length;
            return state.chatHistory[size - 1];
        },
        hasModelLoaded: (state) => {
            return state.isModelLoaded;
        },
        hasModelOptionsChanged: (state) => {
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
                "id": Date.now() + 1,
                "role": role,
                "content": message
            });
        },
        async clearMessages(){
            this.chatHistory = [];
        },
        __filterInfo(){
            return toRaw(this.chatHistory).filter(conv => conv.role !== "info");
        },
        async requestChat({chat_template = null, tools = null, documents = null}){
            let filteredInfoChat = this.__filterInfo();
            if(this.isLocal){
                this.wm.sendRequest('chatbot', {
                    jobType: "chat",
                    messages: structuredClone(toRaw(filteredInfoChat)),
                    chat_template,
                    tools,
                    documents
                });
            }else{
                this.wm.sendRequest('chatbot', {
                    jobType: "rChat",
                    messages: structuredClone(toRaw(filteredInfoChat)),
                    remoteOptions: structuredClone(toRaw(this.remoteOptions)),
                    chat_template,
                    tools,
                    documents
                });
            }
        },
        async requestStreamingChat({chat_template = null, tools = null, documents = null}){
            let filteredInfoChat = this.__filterInfo();
            if(this.isLocal){
                this.wm.sendRequest('chatbot', {
                    jobType: "streaming",
                    messages: structuredClone(toRaw(filteredInfoChat)),
                    chat_template,
                    tools,
                    documents
                });
            }else{
                this.wm.sendRequest('chatbot', {
                    jobType: "rStreaming",
                    messages: structuredClone(toRaw(filteredInfoChat)),
                    remoteOptions: structuredClone(toRaw(this.remoteOptions)),
                    chat_template,
                    tools,
                    documents
                });
            }
        },
        async requestEmbeddings(type, texts){
            if(this.isLocal){
                this.wm.sendRequest('chatbot', {
                    jobType: "embeddings",
                    type: type,
                    texts: texts
                });
            }else{
                this.wm.sendRequest('chatbot', {
                    jobType: "rEmbeddings",
                    type: type,
                    texts: texts,
                    remoteOptions: structuredClone(toRaw(this.remoteOptions)),
                });
            }
        },
        async requestRegenerate(id, {chat_template = null, tools = null, documents = null}){
            let filteredInfoChat = this.__filterInfo();
            let filteredChat = toRaw(filteredInfoChat).filter(conv => conv.id  < id);
            this.chatHistory = filteredChat
            if(this.isLocal){
                this.wm.sendRequest('chatbot', {
                    jobType: "streaming",
                    messages: structuredClone(filteredChat),
                    chat_template,
                    tools,
                    documents
                });
            }else{
                this.wm.sendRequest('chatbot', {
                    jobType: "rStreaming",
                    messages: structuredClone(filteredChat),
                    remoteOptions: structuredClone(toRaw(this.remoteOptions)),
                    chat_template,
                    tools,
                    documents
                });
            }
        },
        async requestModelLoad(){
            if(this.isLocal){
                this.oldModelOptions = structuredClone(toRaw(this.modelOptions));
                this.wm.sendRequest('chatbot', {
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
            if(!this.isLocal){
                return;
            }
            this.isModelLoaded = false;
            this.wm.sendRequest('chatbot', {
                jobType: "reset",
            });
        },
        async saveModelOptions(){
            localStorage.setItem(STORAGE_KEY_CHATBOT_MODEL_OPTIONS, JSON.stringify(this.modelOptions));
        },
        async saveRemoteOptions(){
            localStorage.setItem(STORAGE_KEY_CHATBOT_REMOTE_OPTIONS, JSON.stringify(this.remoteOptions));
        },
        async saveIsLocal(){
            localStorage.setItem(STORAGE_KEY_CHATBOT_IS_LOCAL, this.isLocal);
        }
    }
});
