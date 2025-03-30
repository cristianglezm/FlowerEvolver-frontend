<template>
  <div id="settings-options" class="settings-box">
    <h2>Options</h2>
    <div id="pagination-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked pagination will be used, infinite Scroll otherwise.'" />
      <label for="pagination">Pagination: </label>
      <input id="pagination" v-model="FlowerStore.settings.pagination" type="checkbox" @change="saveSettings()">
    </div>
    <div id="loadDemoFlowers-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked the demo flowers will load in Local.'" />
      <label for="loadDemoFlowers">Load Demo Flowers: </label>
      <input id="loadDemoFlowers" v-model="FlowerStore.settings.loadDemoFlowers" type="checkbox" @change="saveSettings()">
    </div>
    <div id="loadCaptionerModel-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked the Captioner will be loaded when the website is loaded.'" />
      <label for="loadCaptionerModel">Load Captioner: </label>
      <input id="loadCaptionerModel" v-model="FlowerStore.settings.loadCaptionerModel" type="checkbox" @change="saveSettings(); loadCaptionerModel();">
    </div>
    <div id="loadModelChatBot-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked the ChatBot will be loaded when the website is loaded.'" />
      <label for="loadChatBotModel">Load ChatBot: </label>
      <input id="loadChatBotModel" v-model="FlowerStore.settings.loadChatBotModel" type="checkbox" @change="saveSettings(); loadChatBotModel();">
    </div>
    <div id="loadModelKokoro-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked the speech generation (Kokoro) model will be loaded when the website is loaded.'" />
      <label for="loadKokoroModel">Load Kokoro: </label>
      <input id="loadKokoroModel" v-model="FlowerStore.settings.loadKokoroModel" type="checkbox" @change="saveSettings(); loadKokoroModel();">
    </div>
    <div id="magnification-option" class="option-box labelInputArea">
      <ToolTip :info="'Adjust the zoom magnification to enhance the view.'" />
      <label for="magnification-range">Magnification:</label>
      <input id="magnification-range" v-model="FlowerStore.settings.magnification" type="range" min="4" max="16" step="2" @change="validateMagnification()">
      <span>{{ FlowerStore.settings.magnification }}x</span>
    </div>
    <div id="persists-option" class="option-box labelInputArea">
      <ToolTip :info="'it will keep data even when low on space'" />
      <label for="persist">Persistent storage: </label>
      <input id="persist" v-model="data.persisted" type="checkbox" @change="persist()">
    </div>
    <div>
      <div id="limit-settings" class="option-box labelInputArea">
        <ToolTip :info="'limit for how many flowers it will load at a time.'" />
        <label for="setLimit">Limit per Page: </label>
        <input id="setLimit" v-model.number="FlowerStore.settings.limit" type="number" min="1" @change="validateLimit()">
      </div>
      <div style="color: lightgreen; text-align: center;"> 
        <ToolTip :info="'Space used by the flowers (usage / quota) if persistent storage is enabled it will use a bit more space, the model adds around 240mb'" />
        {{ data.spaceUsage.toFixed(2) }} / {{ data.spaceQuota.toFixed(2) }} MB
      </div>
    </div>
  </div>
</template>

<script setup>

import { reactive, inject, onBeforeUnmount, onMounted } from 'vue';
import ToolTip from '../components/ToolTip.vue';
import { useFlowerStore, STORAGE_KEY } from '../stores/FlowerStore';

const FlowerStore = useFlowerStore();
let emitter = inject('emitter');

const data = reactive({
    persisted: false,
    spaceUsage: 0.0,
    spaceQuota: 0.0
});

const loadCaptionerModel = () => {
    if(FlowerStore.settings.loadCaptionerModel){
        emitter.emit('App#loadCaptionerModel');
    }
};
const loadChatBotModel = () => {
    if(FlowerStore.settings.loadChatBotModel){
        emitter.emit('ChatBotWidget#loadChatBotModel');
    }
};
const loadKokoroModel = () => {
    if(FlowerStore.settings.loadKokoroModel){
        emitter.emit('ChatBotWidget#loadKokoroModel');
    }
};
const persist = async () => {
    if(!navigator.storage && !navigator.storage.persist){
        return;
    }
    data.persisted  = await navigator.storage.persist();
};
const isPersisted = async () => {
    if(!navigator.storage && !navigator.storage.persisted){
        return false;
    }
    return await navigator.storage.persisted();
};
const calcSpace = async () => {
    if(navigator.storage && navigator.storage.estimate){
        const estimation = await navigator.storage.estimate();
        data.spaceUsage = (estimation.usage / 1e+6);
        data.spaceQuota = (estimation.quota / 1e+6);
    }else{
        data.spaceUsage = 0.0;
        data.spaceQuota = 0.0;
    }
};
onMounted(() => {
    isPersisted().then(p => data.persisted = p);
    calcSpace();
    emitter.on('AppOptions#recalcSpace', () => {
        calcSpace();
    });
    saveSettings();
});
onBeforeUnmount(() => {
    emitter.off('AppOptions#recalcSpace');
});

const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(FlowerStore.settings));
};
const validateLimit = () => {
    FlowerStore.settings.limit = validateInteger(FlowerStore.settings.limit, 100);
    saveSettings();
};
const validateMagnification = () => {
    let magnification = FlowerStore.settings.magnification;
    FlowerStore.settings.magnification = Math.min(16, Math.max(validateInteger(magnification, 4), 4));
    saveSettings();
};
const validateInteger = (number, Default) => {
    if(Number.isNaN(parseInt(number))){
        return Default;
    }
    return number;
};

</script>

<style scoped>
    #settings-options{
        margin: 1em 1em;
        background-color: green;
    }
    #params-settings{
        display: flex;
        flex-flow: column wrap;
        margin: 1em 1em;
        background-color: green;
    }
    .labelInputArea {
        display: block;
        padding-top: 0.31rem;
    }
    .labelInputArea label{
        width: 18.3rem;
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
    .labelInputArea input[type=number]{
        vertical-align:top;
        background-color: green;
        color: lightgreen;
        border: solid lightgreen;
        border-radius: 8rem;
        margin: 0.125rem 0rem 0rem 0.125rem;
        width: 15%;
        text-align: center;
    }
    .labelInputArea input[type=range]{
        background-color: transparent;
        vertical-align: top;
        width: 10%;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
    }
    .labelInputArea input[type=range]::-webkit-slider-runnable-track{
        background-color: lightgreen;
        height: 4px;
    }

    .labelInputArea input[type=range]::-moz-range-track{
        background-color: lightgreen;
        height: 4px;
    }
    .labelInputArea input[type=range]::-ms-track{
        background-color: transparent;
        border-color: transparent;
        color: transparent;
        height: 4px;
    }

    .labelInputArea input[type=range]::-ms-fill-lower{
        background-color: lightgreen;
    }

    .labelInputArea input[type=range]::-ms-fill-upper{
        background-color: transparent;
    }

    .labelInputArea input[type=range]::-webkit-slider-thumb{
        background-color: green;
        border: 2px solid lightgreen;
        cursor: pointer;
        transform: scale(1.5);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        -webkit-appearance: none;
        margin-top: -6px;
        box-shadow: 1px 2px 10px 1px rgba(47, 57, 53, 0.8);
    }
    .labelInputArea input[type=range]::-moz-range-thumb{
        background-color: green;
        border: 2px solid lightgreen;
        cursor: pointer;
        transform: scale(1.5);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        -moz-appearance: none;
        box-shadow: 1px 2px 10px 1px rgba(47, 57, 53, 0.8);
    }
    .labelInputArea input[type=range]::-ms-thumb{
        background-color: green;
        border: 2px solid lightgreen;
        cursor: pointer;
        transform: scale(1.5);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        -ms-appearance: none;
        box-shadow: 1px 2px 10px 1px rgba(47, 57, 53, 0.8);
    }
    .safe-button{
        position: relative;
        font-size: 1.25rem;
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        margin: 0.6rem 0.6rem 0rem 1.25rem;
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
    .unsafe-button{
        position: relative;
        font-size: 1.25rem;
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        margin: 0.6rem 0.6rem 0rem 1.25rem;
        cursor: pointer;
        border-color: whitesmoke;
        background-color: red;
        color: whitesmoke;
    }
    .unsafe-button:hover{
        border-color: red;
        background-color: whitesmoke;
        color: red;
    }
    .settings-box {
        border: 0.25rem solid lightgreen;
        padding: 0.6rem;
        margin-bottom: 1.25rem;
        border-radius: 2rem;
    }
    .settings-box h2{
        text-align: center;
    }
    .option-box {
        margin-bottom: 0.6rem;
    }
    @media only screen and (max-width: 1280px){
        .safe-button{
            font-size: 0.9rem;
        }
        .unsafe-button{
            font-size: 0.9rem;
        }
        .labelInputArea label{
            width: 10.6rem;
            display: inline-block;
            margin: 0rem 0rem 0rem 0.93rem;
        }
        #settings-container{
            font-size: 0.9rem;
            grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
            width: 100%;
        }
        .labelInputArea input[type=number]{
            width: 20%;
        }
    }
    input[type=number] {
        appearance: textfield;
        box-shadow: inset 0rem 0rem 0.3rem 0.125rem black;
    }

</style>

