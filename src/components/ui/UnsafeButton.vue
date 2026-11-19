<template>
  <button class="fe-button unsafe-button" :class="{ small: size === 'small' }" type="button">
    <slot />
  </button>
</template>

<script setup>
/**
 * The red button, for what deletes or cannot be undone.
 *
 * It is a button, as the green one is: `disabled`, `title`, `id`, `data-testid` and `@click` go to it, and a button that
 * is disabled does not click. The margin is `--fe-button-margin` on any element above it.
 *
 * @component UnsafeButton
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
    .unsafe-button{
        border-color: var(--fe-whitesmoke);
        background-color: var(--fe-danger);
        color: var(--fe-whitesmoke);
    }
    .unsafe-button:hover:not(:disabled){
        border-color: var(--fe-danger);
        background-color: var(--fe-whitesmoke);
        color: var(--fe-danger);
    }
</style>
