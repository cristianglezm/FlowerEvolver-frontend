<template>
  <div id="mutationRates-settings" class="settings-box">
    <h2>Mutation Rates</h2>
    <RangeField
      v-model="mutationRates.addNodeRate" input-id="mutation-addNodeRate" label="Add Node Rate: " tooltip="the rate for adding nodes into the Genome of the Flower."
      percent :min="0" :max="1" :step="0.01" @change="validateMutationRates()"
    />
    <RangeField
      v-model="mutationRates.addConnRate" input-id="mutation-addConnRate" label="Add Connection Rate: " tooltip="The rate for adding connections into the Genome of the flower."
      percent :min="0" :max="1" :step="0.01" @change="validateMutationRates()"
    />
    <RangeField
      v-model="mutationRates.removeConnRate" input-id="mutation-removeConnRate" label="Remove Connection Rate: " tooltip="The rate for removing connections from the Genome of the flower."
      percent :min="0" :max="1" :step="0.01" @change="validateMutationRates()"
    />
    <RangeField
      v-model="mutationRates.perturbWeightsRate" input-id="mutation-perturbWeightsRate" label="Perturb Weights Rate: " tooltip="The rate to perturb the weights of connections"
      percent :min="0" :max="1" :step="0.01" @change="validateMutationRates()"
    />
    <RangeField
      v-model="mutationRates.enableRate" input-id="mutation-enableRate" label="Enable Rate: " tooltip="The rate to enable connections"
      percent :min="0" :max="1" :step="0.01" @change="validateMutationRates()"
    />
    <RangeField
      v-model="mutationRates.disableRate" input-id="mutation-disableRate" label="Disable Rate: " tooltip="The rate to disable connections"
      percent :min="0" :max="1" :step="0.01" @change="validateMutationRates()"
    />
    <RangeField
      v-model="mutationRates.actTypeRate" input-id="mutation-actTypeRate" label="Activation Type Rate: " tooltip="The rate to change the activation type in a random node"
      percent :min="0" :max="1" :step="0.01" @change="validateMutationRates()"
    />
    <SafeButton @click="restoreDefaults"> Restore defaults </SafeButton>
  </div>
</template>

<script setup>

import { reactive } from 'vue';
import RangeField from './ui/RangeField.vue';
import { useSettingsStore } from '../stores/SettingsStore';
import SafeButton from './ui/SafeButton.vue';

const SettingsStore = useSettingsStore();

const mutationRates = reactive({
    addNodeRate: SettingsStore.settings.mutationRates.addNodeRate,
    addConnRate: SettingsStore.settings.mutationRates.addConnRate,
    removeConnRate: SettingsStore.settings.mutationRates.removeConnRate,
    perturbWeightsRate: SettingsStore.settings.mutationRates.perturbWeightsRate,
    enableRate: SettingsStore.settings.mutationRates.enableRate,
    disableRate: SettingsStore.settings.mutationRates.disableRate,
    actTypeRate: SettingsStore.settings.mutationRates.actTypeRate
});

const clamp = (val, min, max) => {
    return Math.min(max, Math.max(val, min));
}
const saveSettings = () => {
    SettingsStore.saveSettings();
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
    SettingsStore.settings.mutationRates = mutationRates;
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
        /* a rate goes from 0 to 100, and the slider of the zoom, that goes through 7 values, is too short for it */
        --fe-range-width: 30%;
        /* and on a phone it leaves no room for the label and the value */
        --fe-range-width-tiny: 15%;
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

</style>

