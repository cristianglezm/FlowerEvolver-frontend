<template>
  <div id="params-settings" class="settings-box">
    <h2>Creation parameters</h2>
    <NumberField
      v-model="params.radius" input-id="params-radius" label="Radius: " :min="4" :max="256"
      tooltip="radius of the flower, min: 4 and max: 256, for bigger radius use the desktop app." @change="validateParams()"
    />
    <NumberField
      v-model="params.numLayers" input-id="params-num-layers" label="Number of Layers: " :min="1"
      tooltip="A layer is defined by radius / 2.0, the drawing algorithm will do another pass at half radius for each layer."
      @change="validateParams()"
    />
    <NumberField
      v-model="params.P" input-id="params-p" label="P: " tooltip="It controls how many petals the flower will have."
      @change="validateParams()"
    />
    <NumberField v-model="params.bias" input-id="params-bias" label="Bias: " tooltip="bias for the flower" @change="validateParams()" />
    <SafeButton @click="restoreDefaults()"> Restore defaults </SafeButton>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import NumberField from './ui/NumberField.vue';
import { useSettingsStore } from '../stores/SettingsStore';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { getFlowerEvolver } from '../services/flowerEvolver';
import SafeButton from './ui/SafeButton.vue';

const SettingsStore = useSettingsStore();

const params = reactive({
    radius: SettingsStore.settings.params.radius,
    numLayers: SettingsStore.settings.params.numLayers,
    P: SettingsStore.settings.params.P,
    bias: SettingsStore.settings.params.bias
});

const restoreDefaults = () => {
    params.radius = 64;
    params.numLayers = 3;
    params.P = 6.0;
    params.bias = 1.0;
    validateParams();
};
const clamp = (val, min, max) => {
    return Math.min(max, Math.max(val, min));
};
const getTimesDivisibleBy = (val, divisor) => {
    let count = 0;
    if(divisor <= 1){
        return 1;
    }
    val = Math.abs(val);
    while(val > 1){
        ++count;
        val /= divisor;
    }
    return count;
};
const saveSettings = async () => {
    const fe = await getFlowerEvolver();
    fe.setParams(new FEParams(params.radius, params.numLayers, params.P, params.bias));
    SettingsStore.saveSettings();
};

const validateParams = () => {
    params.radius = clamp(params.radius, 4, 256);
    params.numLayers = clamp(params.numLayers, 1, getTimesDivisibleBy(params.radius, 2));
    params.P = validateFloat(params.P, 6.0);
    params.bias = validateFloat(params.bias, 1.0);
    SettingsStore.settings.params = params;
    saveSettings();
};
const validateFloat = (number, Default) => {
    if(Number.isNaN(parseFloat(number))){
        return Default;
    }
    return number;
};

</script>

<style scoped>
    #params-settings{
        display: flex;
        flex-flow: column wrap;
        margin: 1em 1em;
        background-color: var(--fe-green);
    }
    .settings-box {
        border: 0.25rem solid var(--fe-lightgreen);
        padding: 0.6rem;
        margin-bottom: 1.25rem;
        border-radius: 2rem;
    }
    .settings-box h2{
        text-align: center;
    }

</style>

