<template>
  <ModalDialog ref="dialog" size="form" :title="`Split ${name}`" :locked="SpeciesStore.isTuning" data-testid="split-modal">
    <p class="about">
      A small map is trained on the {{ plural(count, 'flower') }} of this species, to tell them apart in
      sub-species. Every sub-species needs at least {{ MIN_PER_CELL }} flowers. You can cancel, and nothing is changed.
    </p>
    <div class="fields">
      <NumberField
        v-model="data.width" input-id="split-columns" label="Columns: " testid="split-columns" :min="1" :max="6" :step="1"
        tooltip="How many sub-species are in a row, from 1 to 6."
      />
      <NumberField
        v-model="data.height" input-id="split-rows" label="Rows: " testid="split-rows" :min="1" :max="6" :step="1"
        tooltip="How many rows of sub-species there are, from 1 to 6."
      />
      <NumberField
        v-model="data.epochs" input-id="split-epochs" label="Epochs: " testid="split-epochs" :min="1" :step="1"
        tooltip="How many times the flowers are shown to the map, more takes longer and tells them apart better."
      />
    </div>
    <p v-if="invalid !== ''" class="invalid" data-testid="split-invalid">{{ invalid }}</p>
    <TrainingPanel
      v-if="shown" class="panel"
      :training="SpeciesStore.training" :width="data.width" :height="data.height"
      @cancel="SpeciesStore.cancelTraining()"
    />
    <div class="buttons">
      <SafeButton :disabled="SpeciesStore.isTuning || invalid !== ''" data-testid="split-start" size="small" @click="start()"> Split </SafeButton>
      <SafeButton :disabled="SpeciesStore.isTuning" data-testid="split-close" size="small" @click="close()"> Close </SafeButton>
    </div>
  </ModalDialog>
</template>

<script setup>
/**
 * The dialog to split the selected species in sub-species, with the progress and how it ended. It can
 * only be closed when nothing is running. Open it with open(), from the component that has it.
 */
import { computed, reactive, ref } from 'vue';
import { useSpeciesStore } from '../../stores/SpeciesStore';
import TrainingPanel from './TrainingPanel.vue';
import NumberField from '../ui/NumberField.vue';
import SafeButton from '../ui/SafeButton.vue';
import ModalDialog from '../ui/ModalDialog.vue';

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
    dialog.value.open();
};
const close = () => {
    dialog.value.close();
};

defineExpose({ open, close });
</script>

<style scoped>
    .about{
        margin: 0 0 0.8rem 0;
        padding: 0 1.4rem;
        font-size: 0.9rem;
        text-align: left;
    }
    .fields{
        margin-bottom: 0.6rem;
        padding: 0 1.4rem;
        text-align: left;
        /* a dialog is narrow: the labels and the pills have the same size on every screen */
        --fe-field-label-width: 9.6rem;
        --fe-field-control-width: 20%;
    }
    .panel{
        margin: 0 1.4rem;
    }
    .invalid{
        margin: 0 0 0.6rem 0;
        padding: 0 1.4rem;
        text-align: left;
        color: var(--fe-black);
        font-weight: bold;
    }
    .buttons{
        --fe-button-margin: 0;
        display: flex;
        gap: 0.6rem;
        margin: 0.8rem 0 0.8rem 0;
        padding: 0 1.4rem;
    }
</style>
