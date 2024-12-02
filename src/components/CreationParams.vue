<template>
  <div id="params-settings" class="settings-box">
    <h2>Creation parameters</h2>
    <div class="labelInputArea">
      <ToolTip :info="'radius of the flower, min: 4 and max: 256, for bigger radius use the desktop app.'" />
      <label for="params-radius">Radius: </label>
      <input id="params-radius" v-model.number="params.radius" type="number" min="4" max="256" @change="validateParams()">
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'A layer is defined by radius / 2.0, the drawing algorithm will do another pass at half radius for each layer.'" />
      <label for="params-num-layers">Number of Layers: </label>
      <input id="params-num-layers" v-model.number="params.numLayers" type="number" min="1" @change="validateParams()">
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'It controls how many petals the flower will have.'" />
      <label for="params-p">P: </label>
      <input id="params-p" v-model.number="params.P" type="number" @change="validateParams()">
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'bias for the flower'" />
      <label for="params-bias">Bias: </label>
      <input id="params-bias" v-model.number="params.bias" type="number" @change="validateParams()">
    </div>
    <button class="safe-button" @click="restoreDefaults()"> Restore defaults </button>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import ToolTip from '../components/ToolTip.vue';
import { useFlowersStore, STORAGE_KEY } from '../store';

const store = useFlowersStore();

const params = reactive({
    radius: store.settings.params.radius,
    numLayers: store.settings.params.numLayers,
    P: store.settings.params.P,
    bias: store.settings.params.bias
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
}
const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.settings));
};

const validateParams = () => {
    params.radius = clamp(params.radius, 4, 256);
    params.numLayers = Math.max(1, params.numLayers);
    params.P = validateFloat(params.P, 6.0);
    params.bias = validateFloat(params.bias, 1.0);
    store.settings.params = params;
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
    .settings-box {
        border: 0.25rem solid lightgreen;
        padding: 0.6rem;
        margin-bottom: 1.25rem;
        border-radius: 2rem;
    }
    .settings-box h2{
        text-align: center;
    }
    @media only screen and (max-width: 1280px){
        .safe-button{
            font-size: 0.9rem;
        }
        .labelInputArea label{
            width: 10.6rem;
            display: inline-block;
            margin: 0rem 0rem 0rem 0.93rem;
        }
        .labelInputArea input[type=number]{
            width: 20%;
        }
    }
    .labelInputArea input[type=number] {
        appearance: textfield;
        box-shadow: inset 0rem 0rem 0.3rem 0.125rem black;
    }

</style>

