<template>
  <div class="fixed-buttons" :class="side" :style="{ top }">
    <slot />
  </div>
</template>

<script setup>
/**
 * A column of FixedButton at an edge of the page. It is the one that fixes them to the page and puts them one under
 * the other, in the order that they are written; each button asks it for its edge, so it is said once.
 *
 * A button is 130px high and the column does not wrap or scroll (a button that slides in would be cut off by it), so
 * it holds as many buttons as fit between `top` and the bottom of the window.
 *
 * The column lets the pointer through: it is as wide as a button, and most of that is off the page.
 *
 * @component FixedButtons
 * @prop {String} side - the edge it is at: `left` or `right`.
 * @prop {String} top - where the first button starts, a CSS length, 12% of the window when it is not said.
 */
import { provide, toRef } from 'vue';
import { FIXED_SIDE } from './fixedButtons';

const props = defineProps({
    side: {
        type: String,
        required: true,
        validator: (value) => ['left', 'right'].includes(value),
    },
    top: {
        type: String,
        default: '12%',
    },
});
provide(FIXED_SIDE, toRef(props, 'side'));
</script>

<style scoped>
    .fixed-buttons{
        display: flex;
        flex-flow: column nowrap;
        justify-content: space-evenly;
        position: fixed;
        z-index: 10;
        pointer-events: none;
    }
    .left{
        left: -25px;
    }
    .right{
        right: -2px;
    }
</style>
