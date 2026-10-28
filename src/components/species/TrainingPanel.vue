<template>
  <div class="TrainingPanel" data-testid="training-panel">
    <div v-if="running" class="running">
      <div class="progress-bar" role="progressbar" :aria-valuenow="props.training.done" aria-valuemin="0" :aria-valuemax="total" data-testid="training-progress">
        <div class="bar" :style="{ width: percent + '%' }" />
      </div>
      <span class="phase" data-testid="training-phase">{{ phase }}</span>
      <button type="button" class="safe-button" data-testid="training-cancel" @click="emit('cancel')"> Cancel </button>
    </div>
    <p v-if="props.training.result" class="result" :class="props.training.result.outcome" data-testid="training-result">{{ props.training.result.message }}</p>
    <QeChart v-if="props.training.qe.length > 0" :values="props.training.qe" />
    <div v-if="props.training.before" class="pair" data-testid="training-occupancy">
      <figure>
        <OccupancyGrid :counts="props.training.before.nodeCounts" :width="props.width" :height="props.height" label="Flowers of each species before" />
        <figcaption>Before</figcaption>
      </figure>
      <figure>
        <OccupancyGrid :counts="props.training.now.nodeCounts" :width="props.width" :height="props.height" label="Flowers of each species now" />
        <figcaption>Now</figcaption>
      </figure>
    </div>
  </div>
</template>

<script setup>
/**
 * A fine-tuning of the classifier as it goes, and how it ended: where it is, the distance to the
 * prototypes after each epoch, and how the flowers are spread over the species before and now.
 *
 * @emits cancel - Event emitted when the Cancel button is clicked, which is only there while it runs.
 *
 * @param {Object} training - The `training` of SpeciesStore.
 * @param {number} width - Species in a row of the classifier.
 * @param {number} height - Rows of species of the classifier.
 */
import { computed } from 'vue';
import QeChart from './QeChart.vue';
import OccupancyGrid from './OccupancyGrid.vue';

const props = defineProps({
    training: {
        type: Object,
        required: true
    },
    width: {
        type: Number,
        required: true
    },
    height: {
        type: Number,
        required: true
    }
});
const emit = defineEmits({
    'cancel': null
});

// nothing to count yet is a bar with nothing in it, not a division by zero
const total = computed(() => Math.max(1, props.training.total));
const percent = computed(() => Math.min(100, (props.training.done / total.value) * 100));
const running = computed(() => props.training.kind !== null);
const phase = computed(() => {
    const { phase: now, done, total } = props.training;
    if(now === 'preparing'){
        return `Reading your flowers: ${done} of ${total}`;
    }
    return now === 'training' && done > 0 ? `Epoch ${done} of ${total}` : 'Starting';
});
</script>

<style scoped>
    .TrainingPanel{
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }
    .running{
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.6rem;
    }
    /* the look of ProgressModal: the lightgreen bar in its dark track */
    .progress-bar{
        flex: 1 1 100%;
        background-color: rgba(4, 97, 43, 0.986);
        box-shadow: inset 0rem 0rem 0.6rem 0.125rem black;
        margin: 0.6rem 0;
    }
    .bar{
        background-color: lightgreen;
        height: 3.125rem;
    }
    .phase{
        font-size: 1.1rem;
    }
    .result{
        margin: 0;
    }
    .result.failed{
        color: red;
    }
    .pair{
        display: flex;
        flex-wrap: wrap;
        gap: 0.9rem;
    }
    figure{
        margin: 0;
    }
    figcaption{
        font-size: 0.8rem;
        text-align: center;
    }
    .safe-button{
        font-size: 0.9rem;
        border-radius: 1.2rem;
        border: 0.1rem solid lightgreen;
        background-color: green;
        color: lightgreen;
        cursor: pointer;
    }
    .safe-button:hover{
        background-color: lightgreen;
        border-color: green;
        color: green;
    }
</style>
