<template>
  <dialog ref="dialog" class="FineTuneModal" data-testid="finetune-modal" @cancel="keepOpenWhileTuning($event)">
    <h2>Fine-tune the classifier</h2>
    <p class="about">
      The species adapt to the flowers you have made, so they tell your flowers apart better.
      Every flower is read and drawn once, which takes a while if you have many. You can cancel,
      and the classifier you had is put back. The sub-species you made are removed when it is kept.
    </p>
    <div class="fields">
      <div class="labelInputArea">
        <ToolTip :info="'How many times every flower is shown to the classifier, more takes longer and adapts the species more.'" />
        <label for="finetune-epochs">Epochs: </label>
        <input id="finetune-epochs" v-model.number="data.epochs" type="number" min="1" step="1" data-testid="finetune-epochs">
      </div>
      <div class="labelInputArea">
        <ToolTip :info="'How far the species move towards the flowers in the first epoch, it gets smaller with each one.'" />
        <label for="finetune-lr">Learning rate: </label>
        <input id="finetune-lr" v-model.number="data.baseLR" type="number" min="0.01" step="0.05" data-testid="finetune-lr">
      </div>
      <div class="labelInputArea">
        <ToolTip :info="'How many neighbouring species move along with the one a flower belongs to, in the first epoch.'" />
        <label for="finetune-radius">Radius: </label>
        <input id="finetune-radius" v-model.number="data.baseRadius" type="number" min="0.5" step="0.5" data-testid="finetune-radius">
      </div>
    </div>
    <p v-if="invalid !== ''" class="invalid" data-testid="finetune-invalid">{{ invalid }}</p>
    <TrainingPanel
      v-if="SpeciesStore.training.ran === 'fineTune' && (SpeciesStore.isTuning || SpeciesStore.training.result !== null)"
      :training="SpeciesStore.training" :width="SpeciesStore.model.width" :height="SpeciesStore.model.height"
      @cancel="SpeciesStore.cancelTraining()"
    />
    <div class="buttons">
      <button type="button" class="safe-button" :disabled="SpeciesStore.isTuning || invalid !== ''" data-testid="finetune-start" @click="start()"> Fine-tune </button>
      <button type="button" class="safe-button" :disabled="SpeciesStore.isTuning" data-testid="finetune-close" @click="close()"> Close </button>
    </div>
  </dialog>
</template>

<script setup>
/**
 * The dialog to fine-tune the classifier, with the progress and how it ended. It can only be closed when
 * nothing is running. Open it with open(), from the component that has it.
 */
import { computed, reactive, ref } from 'vue';
import { useSpeciesStore } from '../../stores/SpeciesStore';
import TrainingPanel from './TrainingPanel.vue';
import ToolTip from '../ToolTip.vue';

const SpeciesStore = useSpeciesStore();
const dialog = ref(null);
const data = reactive({
    epochs: 3,
    baseLR: 0.3,
    baseRadius: 1
});

// what is wrong with the parameters, the first thing, or nothing
const invalid = computed(() => {
    if(!Number.isInteger(data.epochs) || data.epochs < 1){
        return 'Epochs must be a whole number of at least 1.';
    }
    if(!(data.baseLR > 0)){
        return 'The learning rate must be above 0.';
    }
    if(!(data.baseRadius > 0)){
        return 'The radius must be above 0.';
    }
    return '';
});

const start = async () => {
    await SpeciesStore.fineTune({ epochs: data.epochs, baseLR: data.baseLR, baseRadius: data.baseRadius });
};
const open = () => {
    dialog.value.showModal();
};
const close = () => {
    dialog.value.close();
};
// Esc closes a dialog, and what is running would go on behind it
const keepOpenWhileTuning = (event) => {
    if(SpeciesStore.isTuning){
        event.preventDefault();
    }
};

defineExpose({ open, close });
</script>

<style scoped>
    .FineTuneModal{
        width: min(36rem, 92vw);
        padding: 1rem 1.4rem;
        border: 0.1rem solid green;
        border-radius: 0.6rem;
        background-color: rgb(37, 39, 41);
        color: lightgreen;
    }
    .FineTuneModal::backdrop{
        background-color: rgba(0, 0, 0, 0.7);
    }
    h2{
        margin: 0 0 0.4rem 0;
    }
    .about{
        margin: 0 0 0.8rem 0;
        font-size: 0.9rem;
    }
    /* the same as the parameters of Settings: tooltip, label, and the number in a pill */
    .labelInputArea{
        display: block;
        padding-top: 0.31rem;
    }
    .labelInputArea label{
        width: 9.6rem;
        display: inline-block;
        margin: 0rem 0rem 0rem 0.93rem;
    }
    .labelInputArea input[type=number]{
        vertical-align: top;
        background-color: green;
        color: lightgreen;
        border: solid lightgreen;
        border-radius: 8rem;
        margin: 0.125rem 0rem 0rem 0.125rem;
        width: 20%;
        text-align: center;
        appearance: textfield;
    }
    .fields{
        margin-bottom: 0.6rem;
    }
    .invalid{
        margin: 0 0 0.6rem 0;
        color: red;
    }
    .buttons{
        display: flex;
        gap: 0.6rem;
        margin-top: 0.8rem;
    }
    .safe-button{
        font-size: 1rem;
        border-radius: 1.2rem;
        border: 0.1rem solid lightgreen;
        background-color: green;
        color: lightgreen;
        cursor: pointer;
    }
    .safe-button:hover:not(:disabled){
        background-color: lightgreen;
        border-color: green;
        color: green;
    }
    .safe-button:disabled{
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
