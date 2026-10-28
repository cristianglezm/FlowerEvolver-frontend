<template>
  <dialog ref="dialog" class="SplitModal" data-testid="split-modal" @cancel="keepOpenWhileTuning($event)">
    <h2>Split {{ name }}</h2>
    <p class="about">
      A small map is trained on the {{ plural(count, 'flower') }} of this species, to tell them apart in
      sub-species. Every sub-species needs at least {{ MIN_PER_CELL }} flowers. You can cancel, and nothing is changed.
    </p>
    <div class="fields">
      <div class="labelInputArea">
        <ToolTip :info="'How many sub-species are in a row, from 1 to 6.'" />
        <label for="split-columns">Columns: </label>
        <input id="split-columns" v-model.number="data.width" type="number" min="1" max="6" step="1" data-testid="split-columns">
      </div>
      <div class="labelInputArea">
        <ToolTip :info="'How many rows of sub-species there are, from 1 to 6.'" />
        <label for="split-rows">Rows: </label>
        <input id="split-rows" v-model.number="data.height" type="number" min="1" max="6" step="1" data-testid="split-rows">
      </div>
      <div class="labelInputArea">
        <ToolTip :info="'How many times the flowers are shown to the map, more takes longer and tells them apart better.'" />
        <label for="split-epochs">Epochs: </label>
        <input id="split-epochs" v-model.number="data.epochs" type="number" min="1" step="1" data-testid="split-epochs">
      </div>
    </div>
    <p v-if="invalid !== ''" class="invalid" data-testid="split-invalid">{{ invalid }}</p>
    <TrainingPanel
      v-if="shown"
      :training="SpeciesStore.training" :width="data.width" :height="data.height"
      @cancel="SpeciesStore.cancelTraining()"
    />
    <div class="buttons">
      <button type="button" class="safe-button" :disabled="SpeciesStore.isTuning || invalid !== ''" data-testid="split-start" @click="start()"> Split </button>
      <button type="button" class="safe-button" :disabled="SpeciesStore.isTuning" data-testid="split-close" @click="close()"> Close </button>
    </div>
  </dialog>
</template>

<script setup>
/**
 * The dialog to split the selected species in sub-species, with the progress and how it ended. It can
 * only be closed when nothing is running. Open it with open(), from the component that has it.
 */
import { computed, reactive, ref } from 'vue';
import { useSpeciesStore } from '../../stores/SpeciesStore';
import TrainingPanel from './TrainingPanel.vue';
import ToolTip from '../ToolTip.vue';

// what SpeciesTrainer needs for every sub-species
const MIN_PER_CELL = 3;

const SpeciesStore = useSpeciesStore();
const dialog = ref(null);
const data = reactive({
    width: 2,
    height: 2,
    epochs: 3,
    // the species the dialog was opened for: the selection can change while it runs
    cell: null
});

const plural = (n, word) => `${n} ${n === 1 ? word : word + 's'}`;
const name = computed(() => data.cell === null ? '' : SpeciesStore.nameOf(data.cell.x, data.cell.y));
const count = computed(() => data.cell === null ? 0 : SpeciesStore.summary.counts.get(data.cell.x + ',' + data.cell.y) ?? 0);
const shown = computed(() => SpeciesStore.training.ran === 'split' && (SpeciesStore.isTuning || SpeciesStore.training.result !== null));

// what is wrong with the parameters, the first thing, or nothing
const invalid = computed(() => {
    const side = (n) => Number.isInteger(n) && n >= 1 && n <= 6;
    if(!side(data.width) || !side(data.height)){
        return 'Columns and rows are whole numbers from 1 to 6.';
    }
    if(data.width * data.height < 2){
        return 'The map needs at least 2 sub-species.';
    }
    if(!Number.isInteger(data.epochs) || data.epochs < 1){
        return 'Epochs must be a whole number of at least 1.';
    }
    const needed = MIN_PER_CELL * data.width * data.height;
    if(count.value < needed){
        return `${name.value} has ${plural(count.value, 'flower')}, and a map of ${data.width} x ${data.height} needs ${needed}. Use fewer sub-species.`;
    }
    return '';
});

const start = async () => {
    await SpeciesStore.split({ cell: data.cell, width: data.width, height: data.height, epochs: data.epochs });
};
const open = (cell) => {
    data.cell = { x: cell.x, y: cell.y };
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
    .SplitModal{
        width: min(36rem, 92vw);
        padding: 1rem 1.4rem;
        border: 0.1rem solid green;
        border-radius: 0.6rem;
        background-color: rgb(37, 39, 41);
        color: lightgreen;
    }
    .SplitModal::backdrop{
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
        font-size: 0.9rem;
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
