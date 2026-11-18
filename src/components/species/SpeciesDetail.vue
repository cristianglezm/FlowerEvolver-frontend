<template>
  <section class="SpeciesDetail" data-testid="species-detail">
    <PrototypeCanvas :alpha="props.model.prototype(props.selected.x, props.selected.y)" :size="props.model.imageSize" :display="128" :label="name" />
    <div class="info">
      <h2 data-testid="species-detail-name">
        {{ name }} <span class="cell">({{ props.selected.x }}, {{ props.selected.y }})</span>
      </h2>
      <p data-testid="species-detail-count">{{ count }} {{ count === 1 ? 'flower' : 'flowers' }}</p>
      <SafeButton :disabled="count === 0" data-testid="species-use-as-parent" size="small" @click="emit('use-as-parent')"> Use as parent </SafeButton>
      <SafeButton :disabled="!canSplit" :title="splitTitle" data-testid="species-split" size="small" @click="emit('split')"> {{ props.isSplit ? 'Split again...' : 'Split...' }} </SafeButton>
      <UnsafeButton v-if="props.isSplit" data-testid="species-unsplit" size="small" @click="emit('unsplit')"> Remove the split </UnsafeButton>
      <h3>Most similar species</h3>
      <ul class="similar">
        <li v-for="other in similar" :key="other.x + ',' + other.y">
          <SafeButton :data-testid="'species-similar-' + other.x + '-' + other.y" size="small" @click="emit('select', { x: other.x, y: other.y })">
            <PrototypeCanvas :alpha="props.model.prototype(other.x, other.y)" :size="props.model.imageSize" :display="32" :label="other.name" />
            {{ other.name }} ({{ other.count }})
          </SafeButton>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
/**
 * One species in detail: a bigger prototype, its name, how many flowers it has, and the four species
 * whose prototypes are most like it, to go from one to the next.
 *
 * @emits select - Event emitted with { x, y } when one of the similar species is clicked.
 * @emits use-as-parent - Event emitted when the Use as parent button is clicked, which is off while the species is empty.
 * @emits split - Event emitted when the Split button is clicked, which is off while the species has too few flowers.
 * @emits unsplit - Event emitted when Remove the split is clicked, which is there while the species is split.
 *
 * @param {SpeciesModel} model - The classifier in use.
 * @param {Map<string, number>} counts - How many flowers each species has, "x,y" to a number.
 * @param {Object} selected - { x, y } of the species to show.
 * @param {boolean} isSplit - If the species has sub-species.
 */
import { computed } from 'vue';
import PrototypeCanvas from './PrototypeCanvas.vue';
import SafeButton from '../ui/SafeButton.vue';
import UnsafeButton from '../ui/UnsafeButton.vue';

const props = defineProps({
    model: {
        type: Object,
        required: true
    },
    counts: {
        type: Map,
        required: true
    },
    selected: {
        type: Object,
        required: true
    },
    isSplit: {
        type: Boolean,
        default: false
    }
});
const emit = defineEmits({
    'select': null,
    'use-as-parent': null,
    'split': null,
    'unsplit': null
});

// the smallest map is 2 sub-species, and every one needs this many flowers (SpeciesTrainer)
const MIN_TO_SPLIT = 6;

const countOf = (x, y) => props.counts.get(x + ',' + y) ?? 0;
const name = computed(() => props.model.nameOf(props.selected.x, props.selected.y));
const count = computed(() => countOf(props.selected.x, props.selected.y));
const canSplit = computed(() => count.value >= MIN_TO_SPLIT);
const splitTitle = computed(() => canSplit.value ? '' : `A species needs at least ${MIN_TO_SPLIT} flowers to be split`);
const similar = computed(() => {
    return props.model.nearest(props.selected.x, props.selected.y, 4).map(({ x, y }) => {
        return { x, y, name: props.model.nameOf(x, y), count: countOf(x, y) };
    });
});
</script>

<style scoped>
    .SpeciesDetail{
        --fe-button-margin: 0.3rem 0 0 0;
        display: flex;
        flex-wrap: wrap;
        gap: 1.2rem;
        align-items: flex-start;
        padding: 0.6rem 1.2rem;
        border-top: 0.1rem solid var(--fe-green);
        border-bottom: 0.1rem solid var(--fe-green);
    }
    .info h2{
        margin: 0;
        font-size: 1.4rem;
    }
    .cell{
        font-size: 1rem;
        opacity: 0.75;
    }
    .info h3{
        margin: 0.6rem 0 0 0;
        font-size: 1rem;
    }
    .similar{
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }
    .SpeciesDetail .fe-button{
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }
</style>
