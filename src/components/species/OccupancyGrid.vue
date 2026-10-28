<template>
  <div class="OccupancyGrid" role="img" :aria-label="props.label" data-testid="occupancy-grid" :style="{ gridTemplateColumns: 'repeat(' + props.width + ', ' + props.cell + 'px)', '--cell': props.cell + 'px' }">
    <i v-for="(square, i) in squares" :key="i" :style="{ background: square.color }" :title="square.title" />
  </div>
</template>

<script setup>
/**
 * How the flowers are spread over the species, as a small heat map with a square for each species:
 * the more flowers, the lighter. A species with none is black.
 *
 * @param {Array<number>} counts - Flowers of each species, row by row like the classifier has them.
 * @param {number} width - Species in a row.
 * @param {number} height - Rows of species.
 * @param {number} cell - Pixels on each side of a square.
 * @param {string} label - What a screen reader says.
 */
import { computed } from 'vue';

const props = defineProps({
    counts: {
        type: Array,
        required: true
    },
    width: {
        type: Number,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    cell: {
        type: Number,
        default: 14
    },
    label: {
        type: String,
        default: ''
    }
});

const squares = computed(() => {
    const max = Math.max(...props.counts);
    return props.counts.slice(0, props.width * props.height).map((count, i) => {
        const share = count / max;
        return {
            color: count > 0
                ? `rgb(${Math.round(40 + 160 * share)}, ${Math.round(80 + 170 * share)}, ${Math.round(40 + 60 * share)})`
                : '#0b0b0b',
            title: `${count} ${count === 1 ? 'flower' : 'flowers'} at ${i % props.width}, ${Math.floor(i / props.width)}`
        };
    });
});
</script>

<style scoped>
    .OccupancyGrid{
        display: grid;
        gap: 1px;
        width: fit-content;
        background-color: #234;
        border: 1px solid #234;
    }
    .OccupancyGrid i{
        display: block;
        width: var(--cell);
        height: var(--cell);
    }
</style>
