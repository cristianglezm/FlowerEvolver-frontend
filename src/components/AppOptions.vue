<template>
  <div id="settings-options" class="settings-box">
    <h2>Options</h2>
    <CheckboxField
      id="pagination-option" v-model="SettingsStore.settings.pagination" class="option-box" input-id="pagination" label="Pagination: "
      tooltip="if checked pagination will be used, infinite Scroll otherwise." @change="saveSettings()"
    />
    <CheckboxField
      id="loadDemoFlowers-option" v-model="SettingsStore.settings.loadDemoFlowers" class="option-box" input-id="loadDemoFlowers" label="Load Demo Flowers: "
      tooltip="if checked the demo flowers will load in Local." @change="saveSettings()"
    />
    <CheckboxField
      id="loadCaptionerModel-option" v-model="SettingsStore.settings.loadCaptionerModel" class="option-box" input-id="loadCaptionerModel" label="Load Captioner: "
      tooltip="if checked the Captioner will be loaded when the website is loaded." @change="saveSettings(); loadCaptionerModel();"
    />
    <CheckboxField
      id="loadModelChatBot-option" v-model="SettingsStore.settings.loadChatBotModel" class="option-box" input-id="loadChatBotModel" label="Load ChatBot: "
      tooltip="if checked the ChatBot will be loaded when the website is loaded." @change="saveSettings(); loadChatBotModel();"
    />
    <CheckboxField
      id="loadModelKokoro-option" v-model="SettingsStore.settings.loadKokoroModel" class="option-box" input-id="loadKokoroModel" label="Load Kokoro: "
      tooltip="if checked the speech generation (Kokoro) model will be loaded when the website is loaded." @change="saveSettings(); loadKokoroModel();"
    />
    <RangeField
      id="magnification-option" v-model="SettingsStore.settings.magnification" class="option-box"
      input-id="magnification-range" label="Magnification:" tooltip="Adjust the zoom magnification to enhance the view."
      :min="4" :max="16" :step="2" suffix="x" @change="validateMagnification()"
    />
    <CheckboxField
      id="persists-option" v-model="data.persisted" class="option-box" input-id="persist" label="Persistent storage: "
      tooltip="it will keep data even when low on space" @change="persist()"
    />
    <div>
      <NumberField
        id="limit-settings" v-model="SettingsStore.settings.limit" class="option-box" input-id="setLimit"
        label="Limit per Page: " tooltip="limit for how many flowers it will load at a time." :min="1"
        :validate="validateLimit" @change="saveSettings()"
      />
      <div style="color: var(--fe-lightgreen); text-align: center;">
        <ToolTip :info="'Space used by the flowers (usage / quota) if persistent storage is enabled it will use a bit more space, the model adds around 240mb'" />
        {{ data.spaceUsage.toFixed(2) }} / {{ data.spaceQuota.toFixed(2) }} MB
      </div>
    </div>
  </div>
</template>

<script setup>

import { reactive, inject, onBeforeUnmount, onMounted } from 'vue';
import { listen } from '../services/listen';
import ToolTip from '../components/ToolTip.vue';
import CheckboxField from './ui/CheckboxField.vue';
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
// A browser that has no storage, or cannot keep it, is not given what it cannot give: the box is left unchecked.
const persist = async () => {
    if(!navigator.storage || !navigator.storage.persist){
        data.persisted = false;
        return;
    }
    data.persisted  = await navigator.storage.persist();
};
const isPersisted = async () => {
    if(!navigator.storage || !navigator.storage.persisted){
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
const stops = [];
onMounted(() => {
    isPersisted().then(p => data.persisted = p);
    calcSpace();
    stops.push(listen(emitter, 'AppOptions#recalcSpace', () => {
        calcSpace();
    }));
    saveSettings();
});
onBeforeUnmount(() => {
    stops.splice(0).forEach((stop) => stop());
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
        background-color: var(--fe-green);
    }
    #params-settings{
        display: flex;
        flex-flow: column wrap;
        margin: 1em 1em;
        background-color: var(--fe-green);
    }
    .settings-box h2{
        text-align: center;
    }
    .option-box {
        margin-bottom: 0.6rem;
    }
    @media only screen and (max-width: 1280px){
        #settings-container{
            font-size: 0.9rem;
            grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
            width: 100%;
        }
    }

</style>

