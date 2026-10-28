<template>
  <div class="SpeciesMap" :class="{ compact: props.hideEmpty }" data-testid="species-map" :style="gridStyle">
    <SpeciesCard
      v-for="cell in cells" :key="cell.x + ',' + cell.y"
      :x="cell.x" :y="cell.y" :name="cell.name" :count="cell.count" :max="max"
      :alpha="cell.alpha" :size="props.model.imageSize"
      :selected="isSelected(cell)" @select="emit('select', { x: cell.x, y: cell.y })"
    />
  </div>
</template>

<script setup>
/**
 * All the species of the classifier as a grid, the way the classifier has them: neighbours are
 * the species whose prototypes are closest, and the more flowers a species has the greener it is.
 *
 * @emits select - Event emitted with { x, y } when a species is clicked.
 *
 * @param {SpeciesModel} model - The classifier in use.
 * @param {Map<string, number>} counts - How many flowers each species has, "x,y" to a number.
 * @param {Object|null} selected - { x, y } of the species that is shown in detail.
 * @param {boolean} hideEmpty - Leave out the species that have no flowers.
 */
import { computed } from 'vue';
import SpeciesCard from './SpeciesCard.vue';

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
    hideEmpty: {
        type: Boolean,
        default: false
    }
});
const emit = defineEmits({
    'select': null
});

// What a species looks like and is called does not change with its count, which changes while
// the flowers are being classified, so it is not worked out again every time.
const species = computed(() => {
    const all = [];
    for(let y = 0; y < props.model.height; ++y){
        for(let x = 0; x < props.model.width; ++x){
            all.push({ x, y, name: props.model.nameOf(x, y), alpha: props.model.prototype(x, y) });
        }
    }
    return all;
});
const cells = computed(() => {
    const counted = species.value.map((cell) => ({ ...cell, count: props.counts.get(cell.x + ',' + cell.y) ?? 0 }));
    return props.hideEmpty ? counted.filter((cell) => cell.count > 0) : counted;
});
const max = computed(() => Math.max(0, ...props.counts.values()));
const gridStyle = computed(() => props.hideEmpty ? {} : { gridTemplateColumns: `repeat(${props.model.width}, minmax(0, 1fr))` });
const isSelected = (cell) => props.selected !== null && props.selected.x === cell.x && props.selected.y === cell.y;
</script>

<style scoped>
    .SpeciesMap{
        display: grid;
        gap: 0.2rem;
        padding: 0.6rem;
    }
    .SpeciesMap.compact{
        grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr));
    }
</style>
