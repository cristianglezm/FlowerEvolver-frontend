<template>
  <div id="settings-options" class="settings-box">
    <h2>Options</h2>
    <div id="pagination-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked pagination will be used, infinite Scroll otherwise.'" />
      <label for="pagination">Pagination: </label>
      <input id="pagination" v-model="SettingsStore.settings.pagination" type="checkbox" @change="saveSettings()">
    </div>
    <div id="loadDemoFlowers-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked the demo flowers will load in Local.'" />
      <label for="loadDemoFlowers">Load Demo Flowers: </label>
      <input id="loadDemoFlowers" v-model="SettingsStore.settings.loadDemoFlowers" type="checkbox" @change="saveSettings()">
    </div>
    <div id="loadCaptionerModel-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked the Captioner will be loaded when the website is loaded.'" />
      <label for="loadCaptionerModel">Load Captioner: </label>
      <input id="loadCaptionerModel" v-model="SettingsStore.settings.loadCaptionerModel" type="checkbox" @change="saveSettings(); loadCaptionerModel();">
    </div>
    <div id="loadModelChatBot-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked the ChatBot will be loaded when the website is loaded.'" />
      <label for="loadChatBotModel">Load ChatBot: </label>
      <input id="loadChatBotModel" v-model="SettingsStore.settings.loadChatBotModel" type="checkbox" @change="saveSettings(); loadChatBotModel();">
    </div>
    <div id="loadModelKokoro-option" class="option-box labelInputArea">
      <ToolTip :info="'if checked the speech generation (Kokoro) model will be loaded when the website is loaded.'" />
      <label for="loadKokoroModel">Load Kokoro: </label>
      <input id="loadKokoroModel" v-model="SettingsStore.settings.loadKokoroModel" type="checkbox" @change="saveSettings(); loadKokoroModel();">
    </div>
    <RangeField
      id="magnification-option" v-model="SettingsStore.settings.magnification" class="option-box"
      input-id="magnification-range" label="Magnification:" tooltip="Adjust the zoom magnification to enhance the view."
      :min="4" :max="16" :step="2" suffix="x" @change="validateMagnification()"
    />
    <div id="persists-option" class="option-box labelInputArea">
      <ToolTip :info="'it will keep data even when low on space'" />
      <label for="persist">Persistent storage: </label>
      <input id="persist" v-model="data.persisted" type="checkbox" @change="persist()">
    </div>
    <div>
      <NumberField
        id="limit-settings" v-model="SettingsStore.settings.limit" class="option-box" input-id="setLimit"
        label="Limit per Page: " tooltip="limit for how many flowers it will load at a time." :min="1"
        :validate="validateLimit" @change="saveSettings()"
      />
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
import NumberField from './ui/NumberField.vue';
import RangeField from './ui/RangeField.vue';
import { useSettingsStore } from '../stores/SettingsStore';

const SettingsStore = useSettingsStore();
let emitter = inject('emitter');

const data = reactive({
    persisted: false,
    spaceUsage: 0.0,
    spaceQuota: 0.0
});

const loadCaptionerModel = () => {
    if(SettingsStore.settings.loadCaptionerModel){
        emitter.emit('App#loadCaptionerModel');
    }
};
const loadChatBotModel = () => {
    if(SettingsStore.settings.loadChatBotModel){
        emitter.emit('ChatBotWidget#loadChatBotModel');
    }
};
const loadKokoroModel = () => {
    if(SettingsStore.settings.loadKokoroModel){
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
    SettingsStore.saveSettings();
};
const validateLimit = (limit) => validateInteger(limit, 100);
const validateMagnification = () => {
    let magnification = SettingsStore.settings.magnification;
    SettingsStore.settings.magnification = Math.min(16, Math.max(validateInteger(magnification, 4), 4));
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
    }

</style>

