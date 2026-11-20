<template>
  <SafeButton class="return-button">
    <slot>back to top</slot>
  </SafeButton>
</template>

<script setup>
/**
 * The button that floats at the bottom right of the page and takes it back to the top, for a list that has no pages.
 * It is a green button: `@click`, `data-testid` and the rest go to it.
 *
 * @component ReturnButton
 */
import SafeButton from './SafeButton.vue';
</script>

<style scoped>
    /* two classes, so that it wins over the position of the green button wherever the order of the styles falls */
    .fe-button.return-button{
        --fe-button-margin: 0;
        position: fixed;
        right: 2%;
        bottom: 15%;
        padding: 0.31rem 0.93rem;
        z-index: 1;
    }
</style>
