<template>
  <div id="params-settings" class="settings-box">
    <h2>Creation parameters</h2>
    <NumberField
      v-for="field in fields" :key="field.key" v-model="params[field.key]" :input-id="`params-${field.id}`" :label="field.label"
      :min="field.min" :max="field.max" :tooltip="field.tooltip" :validate="validate[field.key]" @change="save()"
    />
    <SafeButton @click="restoreDefaults()"> Restore defaults </SafeButton>
  </div>
</template>

<script setup>
import NumberField from './ui/NumberField.vue';
import SafeButton from './ui/SafeButton.vue';
import { useSettingsStore } from '../stores/SettingsStore';
import { usePetalParams } from '../composables/usePetalParams';

const DEFAULTS = { radius: 64, numLayers: 3, P: 6.0, bias: 1.0 };

const SettingsStore = useSettingsStore();
// what a field that is left empty takes is the default, and what the params are limited to is for the wasm to say
const { params, fields, validate, check, reset } = usePetalParams(SettingsStore.settings.params, DEFAULTS);

// What is typed is saved as the wasm keeps it, and that is what the fields show afterwards. When the wasm cannot say, check
// has said so and nothing is saved.
const save = async () => {
    const kept = await check();
    if(kept !== undefined){
        SettingsStore.setCreationParams(kept);
    }
};
const restoreDefaults = () => {
    reset(DEFAULTS);
    save();
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

