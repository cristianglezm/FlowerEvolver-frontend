<template>
  <button v-if="species" type="button" class="SpeciesBadge" :class="{ atypical: atypical }" data-testid="species-badge" :title="title" @click="open()">
    <span class="name">{{ name }}</span>{{ ' ' }}<span class="cell">({{ species.x }}, {{ species.y }})</span><span v-if="sub !== ''" class="sub" data-testid="species-sub">{{ ' / ' + sub }}</span>
    <span v-if="atypical" class="atypical-mark" data-testid="species-atypical">atypical</span>
  </button>
</template>

<script setup>
/**
 * The species of a flower, on its card: the name of its cell, the cell, and a mark when it is far
 * from the prototype of the species, and its sub-species when the species is split. It shows nothing
 * until the flower has been classified.
 * Clicking it goes to the Species tab with that species selected.
 *
 * @param {number} id - The id of a local flower.
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSpeciesStore } from '../../stores/SpeciesStore';

const props = defineProps({
    id: {
        type: Number,
        required: true
    }
});
const router = useRouter();
const SpeciesStore = useSpeciesStore();

const species = computed(() => SpeciesStore.rowFor(props.id));
const name = computed(() => species.value ? SpeciesStore.nameOf(species.value.x, species.value.y) : '');
const sub = computed(() => species.value ? SpeciesStore.subLabelFor(species.value) : '');
const atypical = computed(() => species.value ? SpeciesStore.isAtypical(species.value) : false);
const title = computed(() => {
    if(!species.value){
        return '';
    }
    const far = atypical.value ? ', farther from it than most of your flowers' : '';
    return `${name.value}${sub.value === '' ? '' : ', sub-species ' + sub.value}, distance to the prototype of the species ${species.value.d.toFixed(2)}${far}`;
});

const open = () => {
    SpeciesStore.select({ x: species.value.x, y: species.value.y });
    router.push('/Species');
};
</script>

<style scoped>
    .SpeciesBadge{
        display: block;
        width: 100%;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        font-size: 0.85rem;
        color: #90ee90;
        text-align: center;
        text-decoration: underline;
        cursor: pointer;
    }
    .SpeciesBadge.atypical{
        color: #ffb347;
    }
    .cell{
        opacity: 0.75;
    }
    .atypical-mark{
        margin-left: 0.3rem;
        font-style: italic;
    }
</style>
