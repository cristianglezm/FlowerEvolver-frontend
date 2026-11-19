<template>
  <button class="fe-button safe-button" :class="{ small: size === 'small' }" type="button">
    <slot />
  </button>
</template>

<script setup>
/**
 * The green button, for what does no harm.
 *
 * It is a button: `disabled`, `title`, `id`, `data-testid` and `@click` go to it, and a button that is disabled does not
 * click. `type` is `button` unless it is told another one. The margin is `--fe-button-margin` (the one of the settings
 * when it is not given), on any element above it.
 *
 * @component SafeButton
 * @prop {String} size - `normal`, 1.25rem (0.9rem on a narrow screen), or `small`, 0.9rem on every screen.
 */
defineProps({
    size: {
        type: String,
        default: 'normal',
        validator: (value) => ['normal', 'small'].includes(value),
    },
});
</script>

<style scoped src="./button.css"></style>
<style scoped>
    .safe-button{
        border-color: var(--fe-lightgreen);
        background-color: var(--fe-green);
        color: var(--fe-lightgreen);
    }
    .safe-button:hover:not(:disabled){
        background-color: var(--fe-lightgreen);
        border-color: var(--fe-green);
        color: var(--fe-green);
    }
</style>
