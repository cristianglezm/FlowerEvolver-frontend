<template>
  <div
    ref="chatBox"
    id="chatbot-grabbable" class="chatbot-widget-core" 
    :class="{'chatbot-widget-expanded': data.expanded, 'chatbot-widget-unexpanded': !data.expanded, 'chatbot-widget-chat-opened': data.chatOpened, 'chatbot-widget-chat-closed': !data.chatOpened }"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
  >
    <div class="fill-content">
      <div class="inlined-menu">
        <div class="v-inlined-menu">
          <div class="gear-button" @click="toggleOptions()">
            <svg version="1.1" viewBox="0 0 24 24" class="svg-icon pointer animate-rotation" style="width: 36px;" stroke-width="2px" aria-label="Settings"><circle pid="0" cx="12" cy="12" r="3" /><path pid="1" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </div>
          <div v-if="!data.expanded" class="expand-button" @click="FullScreenMode(true)">
            <svg height="100%" version="1.1" class="svg-icon pointer animate-expand" viewBox="0 0 36 36" width="60px" aria-label="expand-button"><g><path d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z" /></g><g><path d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z" /></g><g><path d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z" /></g><g><path d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z" /></g></svg>
          </div>
          <div v-else class="expand-button" @click="FullScreenMode(false)">
            <svg height="100%" version="1.1" class="svg-icon pointer animate-unexpand" viewBox="0 0 36 36" width="60px" aria-label="unexpand-button"><g><path d="m 14,14 -4,0 0,2 6,0 0,-6 -2,0 0,4 0,0 z" /></g><g><path d="m 22,14 0,-4 -2,0 0,6 6,0 0,-2 -4,0 0,0 z" /></g><g><path d="m 20,26 2,0 0,-4 4,0 0,-2 -6,0 0,6 0,0 z" /></g><g><path d="m 10,22 4,0 0,4 2,0 0,-6 -6,0 0,2 0,0 z" /></g></svg>
          </div>
        </div>
        <div class="v-inlined-menu">
          <h2>ChatBot</h2>
          <div class="grab-hand" :class="{'grabbed': isDragging}" @mousedown="onMouseDown" @touchstart="onTouchStart">
            <svg class="svg-icon-fill animate-expand" height="32px" width="32px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" xml:space="preserve"><g stroke-width="0" /><g stroke-linecap="round" stroke-linejoin="round" /><g> <g> <g> <path d="M316.02,187.316H195.971c-4.742,0-8.575,3.842-8.575,8.575V315.94c0,4.733,3.833,8.575,8.575,8.575H316.02 c4.742,0,8.575-3.842,8.575-8.575V195.891C324.595,191.158,320.762,187.316,316.02,187.316z M307.445,307.365H204.546V204.466 h102.899V307.365z" /> </g> </g> <g> <g> <path d="M341.882,102.098L262.701,3.135c-3.267-4.073-10.136-4.073-13.403,0l-79.172,98.963c-2.058,2.572-2.452,6.097-1.029,9.072 c1.432,2.975,4.433,4.862,7.726,4.862h40.911v40.911c0,4.733,3.833,8.575,8.575,8.575h59.39c4.742,0,8.575-3.842,8.575-8.575 v-40.911h40.911c3.301,0,6.294-1.886,7.726-4.862C344.335,108.204,343.94,104.671,341.882,102.098z M285.691,98.883 c-4.742,0-8.575,3.842-8.575,8.575v40.911h-42.24v-40.911c0-4.733-3.833-8.575-8.575-8.575h-31.633l61.328-76.668l61.328,76.668 H285.691z" /> </g> </g> <g> <g> <path d="M157.033,217.654h-40.911v-40.911c0-3.293-1.895-6.303-4.853-7.726c-2.984-1.423-6.508-1.029-9.081,1.038L3.216,249.218 C1.183,250.848,0,253.309,0,255.915c0,2.607,1.183,5.068,3.216,6.697l98.972,79.172c1.552,1.243,3.447,1.878,5.359,1.878 c1.26,0,2.538-0.283,3.721-0.849c2.967-1.432,4.853-4.433,4.853-7.726v-40.911h40.911c4.742,0,8.575-3.842,8.575-8.575V226.22 C165.607,221.487,161.766,217.654,157.033,217.654z M148.458,277.027h-40.911c-4.742,0-8.575,3.842-8.575,8.575v31.641 l-76.668-61.336l76.668-61.336v31.641c0,4.733,3.833,8.575,8.575,8.575h40.911V277.027z" /> </g> </g> <g> <g> <path d="M342.885,400.66c-1.415-2.975-4.408-4.862-7.709-4.862h-40.911v-40.911c0-4.733-3.833-8.575-8.575-8.575h-59.39 c-4.742,0-8.575,3.842-8.575,8.575v40.911h-40.911c-3.301,0-6.294,1.887-7.726,4.862c-1.423,2.967-1.029,6.5,1.029,9.072 l79.172,98.972c1.629,2.032,4.099,3.216,6.697,3.216c2.598,0,5.068-1.183,6.697-3.216l79.172-98.972 C343.914,407.16,344.309,403.636,342.885,400.66z M255.996,489.616l-61.328-76.668h31.633c4.742,0,8.575-3.842,8.575-8.575 v-40.911h42.24v40.911c0,4.733,3.833,8.575,8.575,8.575h31.633L255.996,489.616z" /> </g> </g> <g> <g> <path d="M508.784,249.218l-98.972-79.172c-2.581-2.067-6.122-2.461-9.081-1.038c-2.967,1.432-4.853,4.433-4.853,7.726v40.911 h-40.911c-4.742,0-8.575,3.842-8.575,8.575v59.381c0,4.733,3.833,8.575,8.575,8.575h40.911v40.911 c0,3.293,1.895,6.303,4.853,7.726c1.192,0.566,2.452,0.849,3.721,0.849c1.912,0,3.807-0.643,5.359-1.878l98.972-79.172 c2.032-1.621,3.216-4.09,3.216-6.697C512,253.309,510.817,250.848,508.784,249.218z M413.028,317.252V285.61 c0-4.733-3.833-8.575-8.575-8.575h-40.911v-42.231h40.911c4.742,0,8.575-3.842,8.575-8.575v-31.641l76.668,61.336L413.028,317.252 z" /> </g> </g></g></svg>
          </div>
        </div>
        <div class="v-inlined-menu">
          <div class="led-button" title="load chatbot model" >
            <svg
              viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" 
              class="pointer status-icon"
              @click="loadChatBot()"
            >
              <circle
                :class="{'status-icon-online': isChatBotOnline(), 'status-icon-offline': !isChatBotOnline()}"
                cx="50" cy="50" r="50"
              />
            </svg>
          </div>
          <div>
            <img v-if="!data.chatOpened" class="drop-menu pointer" src="@/assets/x32/Arrow_down.png" @click="toggleMessageWindow()">
            <img v-else class="drop-menu pointer" src="@/assets/x32/Arrow_up.png" @click="toggleMessageWindow()">
          </div>
        </div>
      </div>
      <div v-if="data.chatOpened" class="chat-box">
        <div class="chat-messages">
          <div v-for="message in chatHistory" :key="message.id" class="fill-content">
            <div v-if="message.role !== 'system'" class="" @mouseover="message.hover = true" @mouseleave="message.hover = false">
              <div class="chat-message">
                <div class="chat-role">
                  <span>
                    {{ message.role }}
                  </span>
                </div>
                <div class="message-bubble">
                  {{ message.content }}
                </div>
              </div>
              <div v-show="message.role === 'assistant' && message.hover" class="reg-btn">
                <button
                  class="safe-button reg-btn"
                  :class="{'disabled': data.processingMessage}"
                  :disabled="data.processingMessage"
                  @click="regenerate(message.id)"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>
          <div v-if="data.pendingMsg.length" class="chat-message">
            <div class="chat-role">
              <span>
                assistant
              </span>
            </div>
            <div v-scroll-into-view class="message-bubble">
              {{ data.pendingMsg }}
            </div>
          </div>
          <div v-if="data.processingMessage && data.pendingMsg.length === 0" id="pending-msg" v-scroll-into-view class="chat-message">
            <div class="chat-role">
              <span>
                assistant
              </span>
            </div>
            <div class="processing-message-container">
              <div class="bouncing-dots">
                <div class="dot" />
                <div class="dot" />
                <div class="dot" />
              </div>
            </div>
          </div>
        </div>
        <div class="chat-textarea inlined-menu">
          <textarea
            v-model="data.message" type="textarea" :class="{'disabled': data.processingMessage}" 
            :disabled="data.processingMessage"
            placeholder="Type a message..."
            @keydown="handleEnter"
          />
          <div class="chat-buttons">
            <button
              class="safe-button" :class="{'disabled': data.processingMessage}"
              :disabled="data.processingMessage"
              @click="sendMessage()"
            >
              Send
            </button>
          </div>
        </div>
      </div>
      <dialog id="ChatBot-dialog-options" v-toggle-dialog="data.openOptions" class="chatbot-Options">
        <span class="close" @click="toggleOptions()">&times;</span>
        <div>
          <ChatBotModelOptions />
        </div>
      </dialog>
    </div>
    <ConfirmModal :id="'chatbot-confirm-modal'" :channel="ChatBotStore.channel" :on="'ChatBotWidget#ConfirmModal'" />
    <MultiProgressNodal :id="'chatbot-multiProgressBar'" :channel="emitter" :on="'ChatBotWidget#requestMultiProgressBar'" />
  </div>
</template>

<script setup>
/** 
 * @brief A draggable and interactive chatbot component for Vue 3.
 * @usage
 * <template>
 *   <ChatBotWidget
 *     :system="'You are a helpful assistant to help the user.'"
 *     :greetings="'Hello! How can I assist you today?'"
 *     :chatTemplate="'Your custom @huggingface/jinja template here...'"
 *     :tools="[
 *       { name: 'search', description: 'Search the database', parameters: { query: 'string' } },
 *       { name: 'translate', description: 'Translate text', parameters: { text: 'string', language: 'string' } }
 *     ]"
 *     :docKeys="['title1', 'title2']"
 *     :executor="parseAndExecCommand"
 *   />
 * </template>
 * 
 * // Example of a custom executor function
 * const executeFunction = (text) => {
 *  // parse text from llm and process, whatever is returned will be shown on the chat
 *   console.log('Executing function with:', text);
 *   return {
 *      textForUser: 'executed function with' + text,
 *      commandsToConfirm: {
 *          "title":"title for ConfirmModal",
 *          "message":"message ...",
 *          "btnNo": "text for button no",
 *          "btnYes": "text for button yes",
 *          "onConfirm": () => { console.log("fn to execute when user clicks btnYes") }
 *      },
 *   };
 * };
 * 
 * @props
 * - `system` (String, optional): Initial system message to set the chat context. (set this when not going to use tools)
 * - `greetings` (String, optional): Assistant's initial greeting message.
 * - `chatTemplate` (String, optional): Jinja template for formatting chat responses. (set this only when using tools, dockeys and executor)
 * - `tools` (Array<Object>, optional): Array of tool definitions for function prototypes. 
 *   Example: [{ name: 'tool1', description: 'description', parameters: { param1: 'string' } }]
 * - `docKeys` (Array<String>, optional): Array of document keys for additional context.
 * - `executor` (Function, optional): A custom function to execute tasks when the chatbot calls a tool. it should return {textForUser: [], commandsToConfirm: []}
 * 
 * @example
 * The component can be embedded in a parent component with optional props:
 * <ChatBotWidget 
 *     :system="'You are a helpful assistant.'" 
 *     :greetings="'Hello, user!'" 
 *     :tools="[{ name: 'fetchData', description: 'Fetch data from API', parameters: { id:{ type: 'string', required:true, description: 'id paarameter'} } }]"
 *     :docKeys="[\"title1\", \"title2\"]"
 *     :executor="customExecutor"
 * />
 */
import { reactive, ref, computed, toRaw, inject, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useChatBotStore } from '../stores/ChatBotStore';
import { useFlowerStore } from '../stores/FlowerStore';
import { useDraggable } from '../composables/useDraggable';
import ChatBotModelOptions from './ChatBotModelOptions.vue';
import MultiProgressNodal from './MultiProgressModal.vue';
import ConfirmModal from './ConfirmModal.vue';

const { position, onMouseDown, onTouchStart, isDragging, setPosition } = useDraggable();
const FlowerStore = useFlowerStore();
const ChatBotStore = useChatBotStore();
const emitter = inject("emitter");

/**
 * @brief scroll the element into view when rendered or updated.
 * @param {None} No parameters expected.
 */
const vScrollIntoView = {
    mounted: (el) => { 
        el.scrollIntoView(); 
    },
    updated: (el) => {
        el.scrollIntoView();
    }
};
/** 
 * @brief Custom directive to toggle the visibility of a dialog element based on a Boolean value. 
 * @param {Boolean} - The Boolean value to control the dialog's visibility. 
 * @throws Will throw an error if used on an element that is not an HTMLDialogElement. 
 * @example <dialog v-toggle-dialog="isDialogOpen">...</dialog>
 */
const vToggleDialog = {
    updated: (el, binding) => {
        if(el instanceof HTMLDialogElement){
            if(binding.value){
                el.showModal();
            }else{
                el.close();
            }
        }else{
            throw new Error("v-toggle-dialog should only be used on a dialog element");
        }
    }
};
const props = defineProps({
    system:{
        type: String,
        required: false,
        default: null
    },
    greetings:{
        type: String,
        required: false,
        default: "Hello, how can I help you?"
    },
    chatTemplate:{
        type: String,
        required: false,
        default: null
    },
    tools:{
        type: Array,
        required: false,
        default: null
    },
    docKeys:{
        type: Array,
        required: false,
        default: null
    },
    executor:{
        type: Function,
        required: false,
        default: (content) => { return {textForUser: [content], commandsToConfirm: []}; }
    }
});
const chatBox = ref(null);
let parentElementDisplay = ref(null);
let observer;
const data = reactive({
    chatOpened: false,
    openOptions: false,
    expanded: false,
    processingMessage: false,
    message: "",
    pendingMsg: ""
});

const chatHistory = computed(() => {
    return ChatBotStore.getChatHistory();
});
const isChatBotOnline = () => {
    return ChatBotStore.hasModelLoaded();
};
const loadChatBot = () => {
    if(!ChatBotStore.hasModelLoaded()){
        emitter.emit("ChatBotWidget#loadChatBotModel");
    }
};
const toggleMessageWindow = () => {
    data.chatOpened = !data.chatOpened;
    data.expanded = false;
};
const resetPosition = () => {
    const pos = { x: 0, y: 0 };
    if(chatBox){
        let rect = chatBox.value.getBoundingClientRect();
        pos.x = window.innerWidth - rect.width - 20;
        pos.y = window.innerHeight - rect.height - 20;
        setPosition(pos);
    }
}
const FullScreenMode = (expanded) => {
    if(expanded){
        data.expanded = true;
        data.chatOpened = true;
        const pos = { 
            x: 20,
            y: 20
        };
        setPosition(pos);
    }else{
        data.expanded = false;
        data.chatOpened = false;
        // we use nextTick as resetPosition would get the old width and height values.
        nextTick(() => {
            resetPosition();
        });
    }
};
const toggleOptions = () => {
    data.openOptions = !data.openOptions;
};
const handleEnter = (event) => {
    if(event.key === "Enter" && event.shiftKey){
        event.preventDefault();
        data.message += "\n";
    }else if(event.key === "Enter"){
        event.preventDefault();
        sendMessage();
    }
};
const sendMessage = () => {
    if(!ChatBotStore.isModelLoaded){
        FlowerStore.errors.push({message: "ChatBot not loaded, please load it by clicking the red dot."});
        return;
    }
    if(data.message.length === 0 || data.processingMessage){
        return;
    }
    data.processingMessage = true;
    ChatBotStore.addMessage("user", toRaw(data.message));
    ChatBotStore.requestStreamingChat({
        chat_template: props.chatTemplate, 
        tools: props.tools, 
        documents: props.docKeys
    });
    data.message = "";
};
const regenerate = (id) => {
    if(!ChatBotStore.isModelLoaded){
        FlowerStore.errors.push({message: "ChatBot not loaded, please load it by clicking the red dot."});
        return;
    }
    if(data.processingMessage){
        return;
    }
    data.processingMessage = true;
    ChatBotStore.requestRegenerate(id, 
    {
        chat_template: props.chatTemplate, 
        tools: props.tools, 
        documents: props.docKeys
    });
};
const resetChat = () => {
    ChatBotStore.clearMessages();
    if(props.system){
        ChatBotStore.addMessage("system", props.system);
    }
    ChatBotStore.addMessage("assistant", props.greetings);
};
onMounted(() => {
    emitter.on('ChatBotWidget#loadChatBotModel', () => {
        setTimeout(() => {
            emitter.emit('ChatBotWidget#requestMultiProgressBar', {
                status: "setup",
                title: "downloading or loading chatbot model",
                onLoad: async () => {
                    ChatBotStore.requestModelLoad();
                }
            });
        }, 2000);
    });
    ChatBotStore.channel.on('ChatBotWidget#ToEmitter', (e) => {
        emitter.emit(e.eventName, e.event);
    });
    ChatBotStore.channel.on('ChatBotWidget#done', () => {
        data.processingMessage = false;
        data.pendingMsg = "";
    });
    ChatBotStore.channel.on('ChatBotWidget#stream', (e) => {
        if(data.processingMessage){
            data.pendingMsg += e;
        }
    });
    ChatBotStore.executor = props.executor;
    setTimeout(() => {
        resetChat();
        nextTick(() => {
            resetPosition();
        });
    }, 50);
    const parentElement = chatBox.value.parentElement;
    parentElementDisplay.value = getComputedStyle(parentElement).display;
    observer = new MutationObserver(() => {
        parentElementDisplay.value = getComputedStyle(parentElement).display;
        if (parentElementDisplay.value !== 'none') {
            setTimeout(() => {
                resetChat();
                nextTick(() => {
                    resetPosition();
                });
            }, 50);
        }
    });
    observer.observe(parentElement, { attributes: true, attributeFilter: ['style'] });
});
onUnmounted(() => {
    ChatBotStore.channel.off('ChatBotWidget#done');
    ChatBotStore.channel.off('ChatBotWidget#stream');
    ChatBotStore.channel.off('ChatBotWidget#ToEmitter');
    emitter.off("ChatBotWidget#loadChatBotModel");
    if(observer){
        observer.disconnect();
    }
});
</script>

<style scoped>
    .chatbot-widget-core{
        position: fixed;
        display: flex;
        flex-flow: column nowrap;
        box-sizing: border-box;
        background-color: green;
        color: lightgreen;
        border: solid lightgreen;
        border-radius: 0.6em;
        z-index: 10;
        box-shadow: 10px 10px 4px 3px rgba(0, 0, 0, 0.4);
    }
    .chatbot-widget-expanded{
        width: 98% !important;
        height: 95% !important;
    }
    .chatbot-widget-unexpanded{
        max-width: 25% !important;
        max-height: 80% !important;
        height: auto;
    }
    .chatbot-widget-chat-closed{
        height: auto;
    }
    .chatbot-widget-chat-opened{
        height: 80%;
    }
    @media only screen and (max-width: 1280px){
        .chatbot-widget-expanded{
            width: 95% !important;
            height: 95% !important;
        }
        .chatbot-widget-unexpanded{
            max-width: 95% !important;
            max-height: 80% !important;
            height: auto;
        }
        .chatbot-widget-chat-closed{
            height: auto;
        }
        .chatbot-widget-chat-opened{
            height: 80%;
        }
    }
    ::backdrop{
        background-color: white;
        opacity: 0.55;
    }
    .chatbot-Options{
        background-color: green;
        border-radius: 1em;
        border: solid lightgreen;
        color: lightgreen;
        box-shadow: 10px 10px 4px 3px rgba(0, 0, 0, 0.4);
    }
    .close{
        color: lightgreen;
        font-size: 2.3rem;
        font-weight: bold;
        cursor: pointer;
        display: inline-flex;
        flex-flow: row nowrap;
        justify-content: end;
        width: 100%;
        height: 1px;
    }
    .close:hover{
        color: black;
    }
    .fill-content{
        display: flex;
        flex-flow: column nowrap;
        flex-grow: 1;
        height: inherit;
    }
    .inlined-menu{
        display: inline-flex;
        flex-flow: row nowrap;
        width: 100%;
        justify-content: space-between;
    }
    .v-inlined-menu{
        display: inline-flex;
        flex-flow: column nowrap;
        justify-content: space-evenly;
        gap: 2px;
        margin: 0.5em;
    }
    .v-inlined-menu h2{
        margin: 0em;
        padding: 0em;
    }
    .inlined-message{
        display: inline-flex;
        flex-flow: row nowrap;
        width: 100%;
        justify-content: space-evenly;
    }
    .chat-box{
        background-color: rgb(37, 39, 41);
        overflow-y: auto;
        height: fit-content;
        display: flex;
        flex-flow: column nowrap;
        flex-grow: 1;
        border-top: solid lightgreen;
        border-bottom-right-radius: 0.5em;
        border-bottom-left-radius: 0.5em;
    }
    .drop-menu{
        position: relative;
        display: inline-block;
    }
    .pointer{
        cursor: pointer;
    }
    .grab-hand{
        cursor: grab;
        text-align: center;
        margin: 0.5em;
    }
    .grabbed{
        cursor: grabbing;
    }
    .status-icon{
        fill: currentColor;
    }
    .status-icon-online{
        box-shadow: 0 0 5px 8px lime;
        color: lime;
        animation: pulse-lime 2s infinite;
    }
    .status-icon-online::after{
        content: "";
        background: radial-gradient(circle, white 0%, transparent 60%);
    }
    .status-icon-offline{
        box-shadow: 0 0 5px 8px red;
        color: red;
        animation: pulse-red 2s infinite;
    }
    .status-icon-offline:after{
        content: "";
        background: radial-gradient(circle, white 0%, transparent 60%);
    }
    .chat-textarea{
        display: flex;
        flex-flow: row nowrap;
        flex-grow: 1;
        padding-top: 0.30rem;
        max-width: inherit;
        max-height: inherit;
        border-top: solid lightgreen;
        padding-bottom: 0.5em;
    }
    .chat-textarea textarea{
        background-color: green;
        color: lightgreen;
        margin: 0.125em 0em 0em 0.125em;
        box-shadow: inset 0em 0em 0.3em 0.125em black;
        width: 80%;
        font-size: 1.25rem;
        resize: vertical;
        border: none;
        overflow-y: scroll;
        word-wrap: break-word;
        max-width: inherit;
    }
    ::placeholder{
        color: lightgreen;
        opacity: 0.5;
    }
    svg{
        filter: drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));
    }
    .svg-icon{
        display: inline-block;
        color: inherit;
        vertical-align: middle;
        fill: none;
        stroke: currentColor;
    }
    .svg-icon-fill{
        display: inline-block;
        color: inherit;
        vertical-align: middle;
        fill: currentColor;
        stroke: currentColor;
    }
    .animate-rotation:hover {
        animation-name: spin;
        animation-duration: 3s;
        animation-iteration-count: infinite;
        transform-origin: 50% 50%;
        display: inline-block;
    }
    @keyframes spin{
        0% {
            transform: rotate(0deg);
        }
        20%{
            transform: rotate(40deg);
        }
        40%{
            transform: rotate(80deg);
        }
        60%{
            transform: rotate(160deg);
        }
        80%{
            transform: rotate(200deg);
        }
        100% {
            transform: rotate(240deg);
        }
    }
    .gear-button{
        text-align: center;
    }
    .led-button{
        text-align: center;
    }
    .animate-expand:hover{
        animation-name: expand;
        animation-duration: 2s;
        animation-iteration-count: infinite;
        transform-origin: 50% 50%;
        display: inline-block;
    }
    .animate-unexpand:hover{
        animation-name: expand;
        animation-duration: 2s;
        animation-iteration-count: infinite;
        animation-direction: reverse;
        transform-origin: 50% 50%;
        display: inline-block;
    }
    @keyframes expand{
        0%{
            transform: scale(1.0);
        }
        50%{
            transform: scale(1.25);
        }
        100%{
            transform: scale(1.5);
        }
    }
    .expand-button{
        text-align: center;
    }
    .safe-button{
        font-size: 1.25rem;
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        margin: 0rem 0.5rem 0rem 0.5rem;
        cursor: pointer;
        border-color: lightgreen;
        background-color: green;
        color: lightgreen;
    }
    .safe-button:hover{
        background-color: lightgreen;
        border-color: green;
        color: green;
    }
    .safe-button:disabled{
        opacity: 0.5;
        cursor: not-allowed !important;
    }
    .disabled{
        opacity: 0.5;
        cursor: not-allowed !important;
    }
    .vertical-center{
        transform: translate(0%, 50%);
    }
    .horizontal-center{
        transform: translate(50%, 0%);
    }
    .processing-message-container{
        display: flex;
        flex-flow: row nowrap;
        justify-content: center;
        padding: 10px;
        box-shadow: inset 0px 2px 8px 2px lightgreen;
        border-radius: 2em;
        width: 50px;
        height: 25px;
    }
    .bouncing-dots{
        display: flex;
        justify-content: space-between;
        width: 30px;
        position: relative;
        bottom: -20px;
    }
    .dot{
        width: 7.5px;
        height: 7.5px;
        background-color: lightgreen;
        border-radius: 50%;
        animation: bounce 1.5s infinite;
    }
    .dot:nth-child(1) {
        animation-delay: 0s;
    }
    .dot:nth-child(2) {
        animation-delay: 0.3s;
    }
    .dot:nth-child(3) {
        animation-delay: 0.6s;
    }
    @keyframes bounce{
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-20px);
        }
    }
    .chat-messages{
        width: inherit;
        height: inherit;
        display: flex;
        flex-flow: column nowrap;
        flex-grow: 1;
        overflow-y: auto;
        scrollbar-color:  lightgreen green;
    }
    .chat-message{
        display: flex;
        align-items: center;
        gap: 10px;
        width: inherit;
        height: inherit;
        flex-flow: row nowrap;
        padding-top: 20px;
    }
    .chat-role{
        font-size: 0.9rem;
        color: lightgreen;
        background: green;
        border-radius: 0em 50% 50% 0%;
        box-shadow: inset 0px 2px 8px 2px lightgreen;
        padding: 1.5em;
        opacity: 0.8;
    }
    .chat-role::selection{
        background-color: lightgreen;
        color: green;
    }
    span::selection{
        background-color: lightgreen;
        color: green;
    }
    .message-bubble{
        color: lightgreen;
        border-radius: 15px;
        padding: 5px 10px;
        box-shadow: inset 0px 2px 8px 2px lightgreen;
        opacity: 0.8;
        white-space: pre-wrap;
        word-wrap: break-word;
        width: fit-content;
        margin-right: 1em;
    }
    .message-bubble::selection{
        background-color: lightgreen;
        color: green;
    }
    .reg-btn{
        justify-content: flex-end;
        display: flex;
        flex-flow: row nowrap;
        font-size: 0.9rem;
        margin-top: 2px;
    }
    @keyframes pulse{
        0%, 100% {
            box-shadow: 0 0 7.5px 2px whitesmoke;
            opacity: 1;
        }
        50% {
            box-shadow: 0 0 10px 4px whitesmoke;
            opacity: 0.8;
        }
    }
    @keyframes pulse-lime{
        0%, 100% {
            box-shadow: 0 0 7.5px 2px lime;
            opacity: 1;
        }
        50% {
            box-shadow: 0 0 10px 4px lime;
            opacity: 0.8;
        }
    }
    @keyframes pulse-red{
        0%, 100% {
            box-shadow: 0 0 7.5px 2px red;
            opacity: 1;
        }
        50% {
            box-shadow: 0 0 10px 4px red;
            opacity: 0.8;
        }
    }
</style>
