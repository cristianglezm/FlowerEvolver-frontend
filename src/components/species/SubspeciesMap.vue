<template>
  <section class="SubspeciesMap" data-testid="subspecies-map">
    <div class="header">
      <h3>{{ props.name }}: sub-species</h3>
      <button type="button" class="safe-button" :disabled="props.selected === null" data-testid="subspecies-all" @click="emit('select', null)"> All of it </button>
    </div>
    <div class="grid" :style="{ gridTemplateColumns: `repeat(${props.model.width}, minmax(0, 1fr))` }">
      <SpeciesCard
        v-for="cell in cells" :key="cell.x + ',' + cell.y"
        :x="cell.x" :y="cell.y" :name="cell.name" :count="cell.count" :max="max"
        :alpha="cell.alpha" :size="props.model.imageSize" id-prefix="subspecies-card"
        :selected="isSelected(cell)" @select="emit('select', { x: cell.x, y: cell.y })"
      />
    </div>
  </section>
</template>

<script setup>
/**
 * The sub-species of a split species, as a small grid like the map of the species: the prototype of each
 * one, its letter and how many flowers it has. Choosing one filters the flowers of the species.
 *
 * @emits select - Event emitted with { x, y } when a sub-species is clicked, and with null for All of it.
 *
 * @param {SpeciesModel} model - The map of the sub-species.
 * @param {Map<string, number>} counts - How many flowers each sub-species has, "x,y" to a number.
 * @param {Object|null} selected - { x, y } of the sub-species the flowers are filtered by.
 * @param {string} name - The name of the species that is split.
 */
import { computed } from 'vue';
import SpeciesCard from './SpeciesCard.vue';
import { SpeciesModel } from '../../services/SpeciesModel';

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
        default: null
    },
    name: {
        type: String,
        default: ''
    }
});
const emit = defineEmits({
    'select': null
});

const cells = computed(() => {
    const all = [];
    for(let y = 0; y < props.model.height; ++y){
        for(let x = 0; x < props.model.width; ++x){
            all.push({
                x, y,
                name: SpeciesModel.subLabel(y * props.model.width + x),
                alpha: props.model.prototype(x, y),
                count: props.counts.get(x + ',' + y) ?? 0
            });
        }
    }
    return all;
});
const max = computed(() => Math.max(0, ...props.counts.values()));
const isSelected = (cell) => props.selected !== null && props.selected.x === cell.x && props.selected.y === cell.y;
</script>

<style scoped>
    .SubspeciesMap{
        padding: 0.6rem 1.2rem;
        border-bottom: 0.1rem solid green;
    }
    .header{
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.6rem;
    }
    h3{
        margin: 0;
        font-size: 1.1rem;
    }
    .grid{
        display: grid;
        gap: 0.2rem;
        max-width: 36rem;
        padding-top: 0.4rem;
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
