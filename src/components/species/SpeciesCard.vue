<template>
  <button
    type="button" class="SpeciesCard" :class="{ selected: props.selected, empty: props.count === 0 }"
    :style="{ '--heat': heat }" :data-testid="props.idPrefix + '-' + props.x + '-' + props.y" :title="title" @click="emit('select')"
  >
    <PrototypeCanvas :alpha="props.alpha" :size="props.size" :display="48" :label="props.name" />
    <span class="name">{{ props.name }}</span>
    <span class="count" :data-testid="props.idPrefix + '-count'">{{ props.count }}</span>
  </button>
</template>

<script setup>
/**
 * One species on the map: its prototype, its name and how many flowers it has. The more it has
 * compared with the busiest species, the greener the card.
 *
 * @emits select - Event emitted when the card is clicked.
 *
 * @param {number} x - Column of the species on the map.
 * @param {number} y - Row of the species on the map.
 * @param {string} name - The name of the species.
 * @param {number} count - How many flowers the species has.
 * @param {number} max - How many flowers the busiest species has.
 * @param {Array<number>} alpha - The silhouette of the prototype, see PrototypeCanvas.
 * @param {number} size - Pixels on each side of the silhouette.
 * @param {boolean} selected - If it is the species that is shown in detail.
 * @param {string} idPrefix - Start of the data-testid of the card and of its count, for a second map on the page.
 */
import { computed } from 'vue';
import PrototypeCanvas from './PrototypeCanvas.vue';

const props = defineProps({
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        required: true
    },
    max: {
        type: Number,
        required: true
    },
    alpha: {
        type: Array,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    idPrefix: {
        type: String,
        default: 'species-card'
    },
    selected: {
        type: Boolean,
        default: false
    }
});
const emit = defineEmits({
    'select': null
});

const heat = computed(() => props.max > 0 ? props.count / props.max : 0);
const title = computed(() => `${props.name} (${props.x}, ${props.y}): ${props.count} ${props.count === 1 ? 'flower' : 'flowers'}`);
</script>

<style scoped>
    .SpeciesCard{
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.15rem;
        padding: 0.3rem 0.1rem;
        border: 0.1rem solid transparent;
        border-radius: 0.4rem;
        font: inherit;
        font-size: 0.7rem;
        color: lightgreen;
        background-color: rgba(0, 128, 0, calc(var(--heat) * 0.7));
        cursor: pointer;
    }
    .SpeciesCard:hover{
        border-color: green;
    }
    .SpeciesCard.selected{
        border-color: lightgreen;
    }
    .SpeciesCard.empty{
        opacity: 0.45;
    }
    .name{
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .count{
        font-weight: bold;
        font-size: 0.85rem;
    }
    @media only screen and (max-width: 1280px){
        .name{
            display: none;
        }
    }
</style>
