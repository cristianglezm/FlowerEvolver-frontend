<template>
  <button class="page-btn" type="button" :title="direction === 'next' ? 'Next page' : 'Previous page'">
    {{ direction === 'next' ? '>' : '<' }}
  </button>
</template>

<script setup>
/**
 * The round arrow that goes to the page after or the page before. It is a button, and its name is the arrow: `@click`,
 * `disabled` and `data-testid` go to it, and one that is disabled (there is no page that way) does not click.
 *
 * @component PageButton
 * @prop {String} direction - `previous` or `next`.
 */
defineProps({
    direction: {
        type: String,
        required: true,
        validator: (value) => ['previous', 'next'].includes(value),
    },
});
</script>

<style scoped>
    .page-btn{
        font-size: 2.5rem;
        color: var(--fe-green);
        border-radius: 7.8rem;
        background-color: var(--fe-lightgreen);
        text-align: center;
        padding: 0.31rem 0.93rem 0.31rem 0.93rem;
        cursor: pointer;
    }
    .page-btn:hover:not(:disabled){
        background-color: var(--fe-green);
        color: var(--fe-lightgreen);
    }
    .page-btn:disabled{
        cursor: not-allowed;
        opacity: 0.5;
    }
    @media only screen and (max-width: 1280px){
        .page-btn{
            font-size: 0.93rem;
            padding: 0.125rem 0.75rem 0.125rem 0.75rem;
        }
    }
</style>
