<template>
  <ModalDialog ref="dialog" size="form" title="Fine-tune the classifier" :locked="SpeciesStore.isTuning" data-testid="finetune-modal">
    <p class="about">
      The species adapt to the flowers you have made, so they tell your flowers apart better.
      Every flower is read and drawn once, which takes a while if you have many. You can cancel,
      and the classifier you had is put back. The sub-species you made are removed when it is kept.
    </p>
    <div class="fields">
      <NumberField
        v-model="data.epochs" input-id="finetune-epochs" label="Epochs: " testid="finetune-epochs" :min="1" :step="1"
        tooltip="How many times every flower is shown to the classifier, more takes longer and adapts the species more."
      />
      <NumberField
        v-model="data.baseLR" input-id="finetune-lr" label="Learning rate: " testid="finetune-lr" :min="0.01" :step="0.05"
        tooltip="How far the species move towards the flowers in the first epoch, it gets smaller with each one."
      />
      <NumberField
        v-model="data.baseRadius" input-id="finetune-radius" label="Radius: " testid="finetune-radius" :min="0.5" :step="0.5"
        tooltip="How many neighbouring species move along with the one a flower belongs to, in the first epoch."
      />
    </div>
    <p v-if="invalid !== ''" class="invalid" data-testid="finetune-invalid">{{ invalid }}</p>
    <TrainingPanel
      v-if="SpeciesStore.training.ran === 'fineTune' && (SpeciesStore.isTuning || SpeciesStore.training.result !== null)" class="panel"
      :training="SpeciesStore.training" :width="SpeciesStore.model.width" :height="SpeciesStore.model.height"
      @cancel="SpeciesStore.cancelTraining()"
    />
    <div class="buttons">
      <SafeButton :disabled="SpeciesStore.isTuning || invalid !== ''" data-testid="finetune-start" size="small" @click="start()"> Fine-tune </SafeButton>
      <SafeButton :disabled="SpeciesStore.isTuning" data-testid="finetune-close" size="small" @click="close()"> Close </SafeButton>
    </div>
  </ModalDialog>
</template>

<script setup>
/**
 * The dialog to fine-tune the classifier, with the progress and how it ended. It can only be closed when
 * nothing is running. Open it with open(), from the component that has it.
 */
import { computed, reactive, ref } from 'vue';
import { useSpeciesStore } from '../../stores/SpeciesStore';
import TrainingPanel from './TrainingPanel.vue';
import NumberField from '../ui/NumberField.vue';
import SafeButton from '../ui/SafeButton.vue';
import ModalDialog from '../ui/ModalDialog.vue';

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
