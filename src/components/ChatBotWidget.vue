<template>
  <div
    id="chatbot-grabbable"
    ref="chatBox" class="chatbot-widget-core" 
    :class="{'chatbot-widget-expanded': data.expanded, 'chatbot-widget-unexpanded': !data.expanded, 'chatbot-widget-chat-opened': data.chatOpened, 'chatbot-widget-chat-closed': !data.chatOpened }"
    :style="{ left: `${position.x}px`, top: `${position.y}px` }"
  >
    <div class="fill-content">
      <div class="inlined-menu">
        <div class="v-inlined-menu">
          <div class="gear-button pointer" :class="{'disabled': !props.editable }" @click="toggleOptions()">
            <svg version="1.1" viewBox="0 0 24 24" class="svg-icon animate-rotation" style="width: 36px;" stroke-width="2px" aria-label="Settings"><circle pid="0" cx="12" cy="12" r="3" /><path pid="1" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
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
          <div class="led-button" title="load chatbot model">
            <svg
              viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" 
              class="pointer status-icon"
              @click="loadChatBot()"
            >
              <circle
                :class="{'status-icon-online': isChatBotOnline, 'status-icon-offline': !isChatBotOnline}"
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
                  :class="{'disabled': data.processingAudio}"
                  :disabled="data.processingAudio"
                  @click="playMessage(message.content)"
                >
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" class="svg-icon svg-icon-fill" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M7 7.638v8.724c0 1.294 1.464 2.075 2.577 1.376l6.94-4.363a1.615 1.615 0 0 0 0-2.75l-6.94-4.363C8.464 5.562 7 6.344 7 7.638Z" clip-rule="evenodd" /></svg>
                  </span>
                </button>
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
            v-model="data.message"
            v-focus="!data.processingMessage" type="textarea" :class="{'disabled': data.processingMessage}" 
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
          <div class="option-box labelInputArea">
            <ToolTip :info="'if checked it will automatically generate text-to-speech for each message generated.'" />
            <label for="generateSpeech">Generate Speech: </label>
            <input id="generateSpeech" v-model="data.generateSpeech" type="checkbox" @change="onChange">
          </div>
          <details style="margin: 10px;">
            <summary class="bubble-btn">LLM Options</summary>
            <SwitchPanel :mode="ChatBotStore.isLocal" :left="'Model Options'" :right="'Remote Options'" @on-change="togglePanelLLM">
              <template #left>
                <ChatBotModelOptions />
              </template>
              <template #right>
                <LLMRemoteOptions />
              </template>
            </SwitchPanel>
          </details>
          <details style="margin: 10px;">
            <summary class="bubble-btn">TTS Options</summary>
            <SwitchPanel :mode="KokoroStore.isLocal" :left="'Model Options'" :right="'Remote Options'" @on-change="togglePanelKokoro">
              <template #left>
                <KokoroModelOptions />
              </template>
              <template #right>
                <TTSRemoteOptions />
              </template>
            </SwitchPanel>
          </details>
        </div>
      </dialog>
    </div>
    <ConfirmModal :id="'chatbot-confirm-modal'" :channel="ChatBotStore.channel" :on="'ChatBotWidget#ConfirmModal'" />
    <MultiProgressNodal :id="'chatbot-multiProgressBar'" :channel="props.emitter" :on="'ChatBotWidget#requestMultiProgressBar'" />
    <audio ref="audioPlayer" hidden controls />
  </div>
</template>

<script setup>
/** 
 * @brief A draggable and interactive chatbot component for Vue 3.
 * @usage
 * <template>
 *   <ChatBotWidget
 *     :emitter="emitter"
 *     :system="'You are a helpful assistant to help the user.'"
 *     :greetings="'Hello! How can I assist you today?'"
 *     :chatTemplate="'Your custom @huggingface/jinja template here...'"
 *     :tools="[
 *       { name: 'search', description: 'Search the database', parameters: { query: { description: 'query to look for', type: 'string', required: true } } },
 *       { name: 'translate', description: 'Translate text', parameters: {
 *          text: { description: 'text to translate', require: true, type:'string'}, 
 *          language: { description:'lang to translate to', require: true, type:'string'}
 *       }}
 *     ]"
 *     :docKeys="['title1', 'title2']"
 *     :executor="parseAndExecCommand"
 *     :editable="false",
 *     :config="{
 *          generateSpeech: true,
 *          llm:{
 *              isLocal: true, 
 *              modelOptions: {
 *                  host: "huggingface",
 *                  model: "HuggingFaceTB/SmolLM2-135M-Instruct",
 *                  device: "CPU",
 *                  dtype: "q4"
 *              },
 *              remoteOptions:{
 *                  url: "http://localhost:8080",
 *                  api_key: "sk-no-key-required",
 *                  model: "HuggingFaceTB/SmolLM2-135M-Instruct",
 *                  max_tokens: 256,
 *                  top_k: 40,
 *                  top_p: 0.95,
 *                  min_p: 0.05,
 *                  temperature: 0.8
 *              }
 *          },
 *          tts:{
 *              isLocal: true,
 *              modelOptions:{
 *                  host: "huggingface",
 *                  model: "onnx-community/Kokoro-82M-v1.0-ONNX",
 *                  device: "CPU",
 *                  dtype: "q8",
 *                  voice: "af_bella"
 *              },
 *              remoteOptions:{
 *                  url: "http://localhost:8880",
 *                  api_key: "sk-no-key-required",
 *                  model: "kokoro",
 *                  voice: "af_bella"
 *              }
 *          }
 *     }"
 *   />
 * </template>
 * // Example of loading the model from outside the ChatBotWidget
 *  emitter.emit('ChatBotWidget#loadChatBotModel'); // load the llm
 *  emitter.emit('ChatBotWidget#loadKokoroModel'); // load the tts
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
 * - `emitter` (String, required): event bus to be able to load the model from outside the ChatBotWidget.
 *   Example: emitter.emit("ChatBotWidget#loadChatBotModel"); // this will load the model
 * - `system` (String, optional): Initial system message to set the chat context. (set this when not going to use tools)
 * - `greetings` (String, optional): Assistant's initial greeting message.
 * - `chatTemplate` (String, optional): Jinja template for formatting chat responses. (set this only when using tools, dockeys and executor)
 * - `tools` (Array<Object>, optional): Array of tool definitions for function prototypes. 
 *   Example: [{ "name": 'tool1', "description": 'description', "parameters": { "param1": {"description":'param1 desc', "require": true, "type":'string'} }}]
 * - `docKeys` (Array<String>, optional): Array of document keys for additional context.
 * - `executor` (Function, optional): A custom function to execute tasks when the chatbot calls a tool. it should return {textForUser: [], commandsToConfirm: []}
 * - `editable` (Boolean, optional): controls if settings can be edited or not if not you must give config prop.
 * - `config` (Object, optional): config object for ChatBotStore, more info on @usage
 * 
 * @example
 * The component can be embedded in a parent component with optional props:
 * <ChatBotWidget 
 *     :emitter="emitter" // this is a mit() event bus
 *     :system="'You are a helpful assistant.'" 
 *     :greetings="'Hello, user!'" 
 *     :tools="[{ name: 'fetchData', description: 'Fetch data from API', parameters: { id:{ type: 'string', required:true, description: 'id paarameter'} } }]"
 *     :docKeys="[\"title1\", \"title2\"]"
 *     :executor="customExecutor"
 * />
 */
import { reactive, ref, computed, toRaw, onMounted, onUnmounted, nextTick } from 'vue';
import { useChatBotStore } from '../stores/ChatBotStore';
import { useKokoroStore } from '../stores/KokoroStore';
import { useErrorStore } from '../stores/ErrorStore';
import { useDraggable } from '../composables/useDraggable';
import SwitchPanel from './SwitchPanel.vue';
import ToolTip from './ToolTip.vue';
import ChatBotModelOptions from './ChatBotModelOptions.vue';
import KokoroModelOptions from './KokoroModelOptions.vue';
import LLMRemoteOptions from './LLMRemoteOptions.vue';
import TTSRemoteOptions from './TTSRemoteOptions.vue';
import MultiProgressNodal from './MultiProgressModal.vue';
import ConfirmModal from './ConfirmModal.vue';

const { position, onMouseDown, onTouchStart, isDragging, setPosition } = useDraggable();
const ErrorStore = useErrorStore();
const ChatBotStore = useChatBotStore();
const KokoroStore = useKokoroStore();

/**
 * @brief scroll the element into view when rendered or updated.
 * @param {None} No parameters expected.
 * @example <div v-scroll-into-view >...</div>
 */
const vScrollIntoView = {
    mounted: (el) => { 
        el.scrollIntoView({
            block: "end",
            behavior: "smooth"
        });
    },
    updated: (el) => {
        el.scrollIntoView({
            block: "end",
            behavior: "smooth"
        });
    }
};
/** 
 * @brief Custom directive to set focus on an element based on a Boolean value. 
 * @param {Boolean} - The Boolean value to control the element's focus. 
 * @example <input v-focus="shouldFocus" />
 */
const vFocus = {
    updated: (el, binding) => {
        if(binding.value){
            el.focus();
        }
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
    emitter:{
        type: Object,
        required: true,
        default: null
    },
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
    },
    editable:{
        type: Boolean,
        required: false,
        default: true
    },
    config:{
        type: Object,
        required: false,
        default: null
    }
});
const chatBox = ref(null);
let parentElementDisplay = ref(null);
let observer;
const CHATBOT_SETTINGS_KEY = 'chatbotWidget#generateSpeech';
const data = reactive({
    chatOpened: false,
    openOptions: false,
    expanded: false,
    processingMessage: false,
    processingAudio: false,
    generateSpeech: JSON.parse(localStorage.getItem(CHATBOT_SETTINGS_KEY) || JSON.stringify(false)),
    message: "",
    pendingMsg: ""
});

const chatHistory = computed(() => {
    return ChatBotStore.getChatHistory;
});
const onChange = () => {
    localStorage.setItem(CHATBOT_SETTINGS_KEY, data.generateSpeech);
}
const togglePanelLLM = () => {
    let wasLocal = ChatBotStore.isLocal;
    ChatBotStore.isLocal = !ChatBotStore.isLocal;
    ChatBotStore.saveIsLocal();
    if(wasLocal){
        if(ChatBotStore.hasModelLoaded){
            // reset local model when user changes to remote
            ChatBotStore.requestReset();
        }
    }else{
        if(ChatBotStore.hasModelLoaded){
            // reload local model when user changes to local
            props.emitter.emit("ChatBotWidget#loadChatBotModel");
        }
    }
};
const togglePanelKokoro = () => {
    let wasLocal = KokoroStore.isLocal;
    KokoroStore.isLocal = !KokoroStore.isLocal;
    KokoroStore.saveIsLocal();
    if(wasLocal){
        if(KokoroStore.hasModelLoaded){
            // reset local model when user changes to remote
            KokoroStore.requestReset();
        }
    }else{
        if(KokoroStore.hasModelLoaded){
            // reload local model when user changes to local
            props.emitter.emit("ChatBotWidget#loadKokoroModel");
        }
    }
};
const isChatBotOnline = computed(() => {
    return ChatBotStore.hasModelLoaded;
});
const loadChatBot = () => {
    if(ChatBotStore.isLocal){
        if(!ChatBotStore.hasModelLoaded){
            props.emitter.emit("ChatBotWidget#loadChatBotModel");
        }
    }else{
        ChatBotStore.requestModelLoad();
    }
    if(!KokoroStore.hasModelLoaded && data.generateSpeech){
        KokoroStore.requestModelLoad();
    }
};
const toggleMessageWindow = () => {
    data.chatOpened = !data.chatOpened;
    data.expanded = false;
};
const resetPosition = () => {
    const pos = { x: 0, y: 0 };
    if(chatBox.value){
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
    if(!props.editable){
        return;
    }
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
        ErrorStore.push("ChatBot not loaded, please load it by clicking the red dot.");
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
        ErrorStore.push("ChatBot not loaded, please load it by clicking the red dot.");
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
const playMessage = async (text) => {
    let audio = await KokoroStore.getAudio(text);
    if(audio){
        playAudio(audio);
    }else{
        if(KokoroStore.hasModelLoaded && !data.processingAudio){
            data.processingAudio = true;
            KokoroStore.requestAudioGen(text);
        }else{
            ErrorStore.push("The Speech generation model is not loaded, please load it first.");
        }
    }
};
const audioPlayer = ref(null);
const playAudio = (audio) => {
    if(audioPlayer.value){
        audioPlayer.value.src = audio;
        audioPlayer.value.play();
    }
};
onMounted(() => {
    props.emitter.on('ChatBotWidget#loadChatBotModel', () => {
        setTimeout(() => {
            props.emitter.emit('ChatBotWidget#requestMultiProgressBar', {
                status: "setup",
                title: "downloading or loading chatbot model",
                onLoad: async () => {
                    ChatBotStore.requestModelLoad();
                }
            });
        }, 2000);
    });
    props.emitter.on('ChatBotWidget#loadKokoroModel', () => {
        setTimeout(() => {
            props.emitter.emit('ChatBotWidget#requestMultiProgressBar', {
                status: "setup",
                title: "downloading or loading Kokoro model",
                onLoad: async () => {
                    KokoroStore.requestModelLoad();
                }
            });
        }, 2000);
    });
    KokoroStore.channel.on('ChatBotWidget#audioResp', (e) => {
        data.processingAudio = false;
        playAudio(e.audio);
    });
    KokoroStore.channel.on('ChatBotWidget#ToEmitter', (e) => {
        props.emitter.emit(e.eventName, e.event);
    });
    ChatBotStore.channel.on('ChatBotWidget#ToEmitter', (e) => {
        props.emitter.emit(e.eventName, e.event);
    });
    ChatBotStore.channel.on('ChatBotWidget#done', async () => {
        data.processingMessage = false;
        data.pendingMsg = "";
        if(KokoroStore.hasModelLoaded && data.generateSpeech && !data.processingAudio){
            data.processingAudio = true;
            let text = ChatBotStore.getLastMessage().content;
            let audio = await KokoroStore.getAudio(text);
            if(audio){
                playAudio(audio);
                data.processingAudio = false;
            }else{
                KokoroStore.requestAudioGen(text);
            }
        }
    });
    ChatBotStore.channel.on('ChatBotWidget#stream', (e) => {
        if(data.processingMessage){
            data.pendingMsg += e;
        }
    });
    ChatBotStore.executor = props.executor;
    if(!props.editable){
        const applyConfig = (config, store) => {
            for(const key in config){
                if(Object.prototype.hasOwnProperty.call(config, key) && 
                    config[key] !== undefined){
                    if(typeof config[key] === 'object' && 
                        !Array.isArray(config[key])){
                            if(store[key] !== undefined){
                                applyConfig(config[key], store[key]);
                            }
                    }else{
                        if(store[key] !== undefined){
                            store[key] = config[key];
                        }
                    }
                }
            }
        };
        if(props.config === null){
            throw Error("props.config is null, if props.editable is false, you need to provide a valid props.config");
        }
        if(props.config.generateSpeech){
            data.generateSpeech = props.config.generateSpeech;
        }
        applyConfig(props.config.llm, ChatBotStore);
        applyConfig(props.config.tts, KokoroStore);
    }
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
    KokoroStore.channel.off('ChatBotWidget#ToEmitter');
    KokoroStore.channel.off('ChatBotWidget#audioResp');
    props.emitter.off("ChatBotWidget#loadChatBotModel");
    props.emitter.off('ChatBotWidget#loadKokoroModel');
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
    .bubble-btn{
        font-size: x-large;
        border: solid 1px lightgreen;
        border-radius: 25px;
        padding: 2px 5px 2px 5px;
        box-shadow: inset 1px 1px 10px 2px lightgreen;
        cursor: pointer;
        margin-bottom: 20px;
        margin-top: 20px;
    }
    .bubble-btn:hover{
        background-color: lightgreen;
        color: green;
        border: solid 1px green;
        box-shadow: inset 1px 1px 10px 2px black;
    }
    .bubble-btn:disabled{
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
    .labelInputArea {
        display: block;
        padding-top: 0.31rem;
    }
    .labelInputArea label{
        width: 10.3rem;
        display: inline-block;
        margin: 0rem 0rem 0rem 0.93rem;
    }
    .labelInputArea input[type=checkbox]{
        background-color: green;
        color:lightgreen;
        border: solid lightgreen;
        cursor: pointer;
        display: inline-grid;
        place-content: center;
        grid-template-columns: 0.5em auto;
        gap: 0.1em;
        font-size: 2rem;
        font-weight: bold;
        -webkit-appearance: none;
        appearance: none;
        box-shadow: inset 0rem 0rem 0.2rem 0.125rem black;
    }
    .labelInputArea input[type="checkbox"]::before {
        content: "";
        width: 0.65em;
        height: 0.65em;
        transform: scale(0);
        transition: 120ms transform cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: inset 2em 2em lightgreen;
        transform-origin: top left;
        clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
    }
    .labelInputArea input[type="checkbox"]:checked::before {
        transform: scale(1);
    }
    .option-box {
        text-align: center;
        margin-bottom: 0.6rem;
    }
    @media only screen and (max-width: 1280px){
        .labelInputArea label{
            width: 10.6rem;
            display: inline-block;
            margin: 0rem 0rem 0rem 0.93rem;
        }
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
