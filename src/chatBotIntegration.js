import ChatBotWidget from './components/ChatBotWidget.vue';
import { chat_template, tools, documents, execCommand, initRouter, initEmitter } from './stores/ChatBotConfig';
import { useCaptionerStore } from './stores/CaptionerStore';

export { ChatBotWidget, chat_template, tools, documents, execCommand };

/**
 * Wires up the chatbot's event plumbing. Call once, from the app shell's
 * onMounted.
 * @param emitter the app-wide mitt event bus (see main.js)
 * @param settings FlowerStore.settings - drives which models load on start
 */
export function registerChatBot(emitter, settings){
    const CaptionerStore = useCaptionerStore();
    // we call this for execCommand's goto fn
    initRouter();
    // we call this for execCommand's describe fn
    initEmitter(emitter);
    emitter.on('App#loadCaptionerModel', () => {
        setTimeout(() => {
            emitter.emit('requestMultiProgressBar', {
                status: "setup",
                title: "downloading or loading captioner model",
                onLoad: async () => {
                    CaptionerStore.requestModelLoad();
                }
            });
        }, 2000);
    });
    CaptionerStore.channel.on('App#ToEmitter', (e) => {
        emitter.emit(e.eventName, e.event);
    });
    if(settings.loadCaptionerModel){
        emitter.emit('App#loadCaptionerModel');
    }
    if(settings.loadChatBotModel){
        emitter.emit('ChatBotWidget#loadChatBotModel');
    }
    if(settings.loadKokoroModel){
        emitter.emit('ChatBotWidget#loadKokoroModel');
    }
}

/**
 * Tears down what registerChatBot() wired up. Call once, from the app
 * shell's onUnmounted.
 * @param emitter the same mitt event bus passed to registerChatBot()
 */
export function unregisterChatBot(emitter){
    const CaptionerStore = useCaptionerStore();
    CaptionerStore.channel.off('App#ToEmitter');
    emitter.off('App#loadCaptionerModel');
}
