<template>
  <div id="mutationRates-settings" class="settings-box">
    <h2>Mutation Rates</h2>
    <div class="labelInputArea">
      <ToolTip :info="'the rate for adding nodes into the Genome of the Flower.'" />
      <label for="mutation-addNodeRate">Add Node Rate: </label>
      <input
        id="mutation-addNodeRate" v-model.number="mutationRates.addNodeRate" type="number" min="0.0" 
        max="1.0" @change="validateMutationRates()"
      >
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'The rate for adding connections into the Genome of the flower.'" />
      <label for="mutation-addConnRate">Add Connection Rate: </label>
      <input
        id="mutation-addConnRate" v-model.number="mutationRates.addConnRate" type="number" min="0.0" 
        max="1.0" @change="validateMutationRates()"
      >
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'The rate for removing connections from the Genome of the flower.'" />
      <label for="mutation-removeConnRate">Remove Connection Rate: </label>
      <input
        id="mutation-removeConnRate" v-model.number="mutationRates.removeConnRate" type="number" min="0.0" 
        max="1.0" @change="validateMutationRates()"
      >
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'The rate to perturb the weights of connections'" />
      <label for="mutation-perturbWeightsRate">Perturb Weights Rate: </label>
      <input
        id="mutation-perturbWeightsRate" v-model.number="mutationRates.perturbWeightsRate" type="number" min="0.0" 
        max="1.0" @change="validateMutationRates()"
      >
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'The rate to enable connections'" />
      <label for="mutation-enableRate">Enable Rate: </label>
      <input
        id="mutation-enableRate" v-model.number="mutationRates.enableRate" type="number" min="0.0" 
        max="1.0" @change="validateMutationRates()"
      >
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'The rate to disable connections'" />
      <label for="mutation-disableRate">Disable Rate: </label>
      <input
        id="mutation-disableRate" v-model.number="mutationRates.disableRate" type="number" min="0.0" 
        max="1.0" @change="validateMutationRates()"
      >
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'The rate to change the activation type in a random node'" />
      <label for="mutation-actTypeRate">Activation Type Rate: </label>
      <input
        id="mutation-actTypeRate" v-model.number="mutationRates.actTypeRate" type="number" min="0.0" 
        max="1.0" @change="validateMutationRates()"
      >
    </div>
    <button class="safe-button" @click="restoreDefaults"> Restore defaults </button>
  </div>
</template>

<script setup>

import { reactive } from 'vue';
import ToolTip from '../components/ToolTip.vue';
import { useFlowerStore, STORAGE_KEY } from '../stores/FlowerStore';

const FlowerStore = useFlowerStore();

const mutationRates = reactive({
    addNodeRate: FlowerStore.settings.mutationRates.addNodeRate,
    addConnRate: FlowerStore.settings.mutationRates.addConnRate,
    removeConnRate: FlowerStore.settings.mutationRates.removeConnRate,
    perturbWeightsRate: FlowerStore.settings.mutationRates.perturbWeightsRate,
    enableRate: FlowerStore.settings.mutationRates.enableRate,
    disableRate: FlowerStore.settings.mutationRates.disableRate,
    actTypeRate: FlowerStore.settings.mutationRates.actTypeRate
});

const clamp = (val, min, max) => {
    return Math.min(max, Math.max(val, min));
}
const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(FlowerStore.settings));
};
const restoreDefaults = () => {
    mutationRates.addNodeRate = 0.2;
    mutationRates.addConnRate = 0.3;
    mutationRates.removeConnRate = 0.2;
    mutationRates.perturbWeightsRate = 0.6; 
    mutationRates.enableRate = 0.35;
    mutationRates.disableRate = 0.3;
    mutationRates.actTypeRate = 0.4;
    validateMutationRates();
};
const validateMutationRates = () => {
    mutationRates.actTypeRate = clamp(mutationRates.actTypeRate, 0.0, 1.0);
    mutationRates.addConnRate = clamp(mutationRates.addConnRate, 0.0, 1.0);
    mutationRates.addNodeRate = clamp(mutationRates.addNodeRate, 0.0, 1.0)
    mutationRates.disableRate = clamp(mutationRates.disableRate, 0.0, 1.0)
    mutationRates.enableRate = clamp(mutationRates.enableRate, 0.0, 1.0)
    mutationRates.perturbWeightsRate = clamp(mutationRates.perturbWeightsRate, 0.0, 1.0)
    mutationRates.removeConnRate = clamp(mutationRates.removeConnRate, 0.0, 1.0)
    FlowerStore.settings.mutationRates = mutationRates;
    saveSettings();
};

</script>

<style scoped>
    #mutationRates-settings{
        display: flex;
        flex-flow: column wrap;
        margin: 1em 1em;
        border-radius: 1.25rem;
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
            width: 9.6rem;
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

