<template>
  <button class="favourite-btn" type="button" aria-label="Favourite" :aria-pressed="favourited === true" :disabled="disabled" @click="emit('toggle')">
    <img :src="frames[index]" alt="" data-testid="favourite-heart">
  </button>
</template>

<script setup>
/**
 * The heart of a flower: empty when it is not a favourite, full when it is. It does not decide what a click does, it
 * says `toggle` and the one that owns the flower changes `favourited`; the heart then fills or empties in a few frames.
 *
 * `favourited` is `null` while it is not known (a card asks the database after it is shown): the heart is empty, and
 * when the answer comes it is shown as it is, without the animation, so a page of favourites does not play it a
 * hundred times. It is a button: `disabled`, `data-testid` and the rest go to it, and one that is disabled does not click.
 *
 * @component FavouriteButton
 * @prop {Boolean|null} favourited - whether the flower is a favourite, `null` when it is not known yet.
 * @prop {Boolean} disabled - for a flower that cannot be a favourite.
 * @emits toggle - it was clicked.
 */
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps({
    favourited: {
        type: Boolean,
        default: null,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits(['toggle']);

// 0 is empty and the last one is full, the ones between are the heart filling
const frames = [
    new URL('../../assets/x32/heart_empty.png', import.meta.url).href,
    new URL('../../assets/x32/heart_filling0.png', import.meta.url).href,
    new URL('../../assets/x32/heart_filling1.png', import.meta.url).href,
    new URL('../../assets/x32/heart_filling2.png', import.meta.url).href,
    new URL('../../assets/x32/heart_filling3.png', import.meta.url).href,
    new URL('../../assets/x32/heart_filling4.png', import.meta.url).href,
    new URL('../../assets/x32/heart_full.png', import.meta.url).href,
];
const LAST = frames.length - 1;
const FRAME_MS = 50;

const index = ref(props.favourited ? LAST : 0);
let timer;
const stop = () => {
    clearTimeout(timer);
    timer = undefined;
};
// one frame at a time towards the one that the heart has to end at
const animateTo = (target) => {
    stop();
    const step = () => {
        if(index.value === target){
            return;
        }
        index.value += index.value < target ? 1 : -1;
        timer = setTimeout(step, FRAME_MS);
    };
    timer = setTimeout(step, FRAME_MS);
};
watch(() => props.favourited, (now, before) => {
    const target = now ? LAST : 0;
    if(before === null || before === undefined){
        stop();
        index.value = target;
    }else{
        animateTo(target);
    }
});
onUnmounted(stop);
</script>

<style scoped>
    .favourite-btn{
        display: block;
        padding: 0;
        border: none;
        background: none;
        line-height: 0;
        cursor: pointer;
    }
    .favourite-btn img{
        display: block;
        filter: drop-shadow(2px 2px var(--fe-black));
    }
    .favourite-btn:disabled{
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>
