<template>
  <button class="fixed-button" :class="side" type="button">
    <slot />
  </button>
</template>

<script setup>
/**
 * A button that floats at the edge of the page and slides in when the pointer is over it, for the actions that are
 * always at hand (the ones of the menu on a wide screen). It sits in a column that the menu fixes to the page.
 *
 * It is a button: `disabled`, `title`, `id`, `data-testid` and `@click` go to it, and a button that is disabled does
 * not click. A disabled one still slides in, so that it can be seen, but it does not change its colours.
 *
 * @component FixedButton
 * @prop {String} side - the edge it is at: `left` or `right`.
 */
defineProps({
    side: {
        type: String,
        required: true,
        validator: (value) => ['left', 'right'].includes(value),
    },
});
</script>

<style scoped>
    .fixed-button{
        position: relative;
        font-size: 1.25rem;
        cursor: pointer;
        border-color: var(--fe-lightgreen);
        background-color: var(--fe-surface);
        color: var(--fe-lightgreen);
        z-index: 10;
        width: 180px;
        height: 130px;
        pointer-events: all;
        padding-left: 30px;
        padding-right: 25px;
        box-shadow: 2px 2px 10px 4px rgba(47, 50, 52, 0.8);
    }
    .fixed-button:hover:not(:disabled){
        background-color: var(--fe-lightgreen);
        border-color: var(--fe-green);
        color: var(--fe-green);
    }
    .fixed-button:disabled{
        opacity: 0.5;
        cursor: not-allowed;
    }
    .left{
        border-radius: 0em  2.0em 2.0em 0.0em;
        transform: translate(-130px, 0%);
        transition: transform 0.5s ease;
    }
    .left:hover{
        transform: translate(2px, 0%);
        transition: transform 0.5s ease;
    }
    .right{
        border-radius: 2em  0.0em 0.0em 2em;
        transform: translate(140px, 0%);
        transition: transform 0.5s ease;
    }
    .right:hover{
        transform: translate(-2px, 0%);
        transition: transform 0.5s ease;
    }
</style>
