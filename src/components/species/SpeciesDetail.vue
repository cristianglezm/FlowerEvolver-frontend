<template>
  <section class="SpeciesDetail" data-testid="species-detail">
    <PrototypeCanvas :alpha="props.model.prototype(props.selected.x, props.selected.y)" :size="props.model.imageSize" :display="128" :label="name" />
    <div class="info">
      <h2 data-testid="species-detail-name">
        {{ name }} <span class="cell">({{ props.selected.x }}, {{ props.selected.y }})</span>
      </h2>
      <p data-testid="species-detail-count">{{ count }} {{ count === 1 ? 'flower' : 'flowers' }}</p>
      <button type="button" class="safe-button" :disabled="count === 0" data-testid="species-use-as-parent" @click="emit('use-as-parent')"> Use as parent </button>
      <button type="button" class="safe-button" :disabled="!canSplit" :title="splitTitle" data-testid="species-split" @click="emit('split')"> {{ props.isSplit ? 'Split again...' : 'Split...' }} </button>
      <button v-if="props.isSplit" type="button" class="unsafe-button" data-testid="species-unsplit" @click="emit('unsplit')"> Remove the split </button>
      <h3>Most similar species</h3>
      <ul class="similar">
        <li v-for="other in similar" :key="other.x + ',' + other.y">
          <button type="button" class="safe-button" :data-testid="'species-similar-' + other.x + '-' + other.y" @click="emit('select', { x: other.x, y: other.y })">
            <PrototypeCanvas :alpha="props.model.prototype(other.x, other.y)" :size="props.model.imageSize" :display="32" :label="other.name" />
            {{ other.name }} ({{ other.count }})
          </button>
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
        display: flex;
        flex-wrap: wrap;
        gap: 1.2rem;
        align-items: flex-start;
        padding: 0.6rem 1.2rem;
        border-top: 0.1rem solid green;
        border-bottom: 0.1rem solid green;
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
    .safe-button{
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0.3rem 0 0 0;
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
    .unsafe-button{
        margin: 0.3rem 0 0 0;
        font-size: 0.9rem;
        border-radius: 1.2rem;
        border: 0.1rem solid red;
        background-color: darkred;
        color: white;
        cursor: pointer;
    }
    .unsafe-button:hover{
        background-color: red;
    }
    .safe-button:disabled{
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
