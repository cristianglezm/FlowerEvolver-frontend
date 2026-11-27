<template>
  <div class="field-row">
    <ToolTip v-if="tooltip !== ''" :info="tooltip" />
    <label :for="inputId">{{ label }}</label>
    <slot />
  </div>
</template>

<script setup>
/**
 * A line of the settings: a tooltip, the label, and the control that goes in the slot.
 *
 * The width of the label is the one of the settings, and a place that is narrower or wider says so with these CSS
 * variables on any element above it: `--fe-field-label-width`, `--fe-field-label-width-narrow` (up to 1280px) and
 * `--fe-field-label-width-tiny` (up to 448px, which is the narrow one when it is not given).
 *
 * @component FieldRow
 * @prop {String} label - the text of the label, as it is shown ("Limit per Page: ").
 * @prop {String} tooltip - what the tooltip says, none when it is empty.
 * @prop {String} inputId - the id of the control, that the label is for.
 */
import ToolTip from '../ToolTip.vue';

defineProps({
    label: {
        type: String,
        required: true,
    },
    tooltip: {
        type: String,
        default: '',
    },
    inputId: {
        type: String,
        default: undefined,
    },
});
</script>

<style scoped>
    .field-row{
        display: block;
        padding-top: 0.31rem;
    }
    .field-row label{
        width: var(--fe-field-label-width, 18.3rem);
        display: inline-block;
        margin: 0rem 0rem 0rem 0.93rem;
    }
    @media only screen and (max-width: 1280px){
        .field-row label{
            width: var(--fe-field-label-width-narrow, 9.6rem);
        }
    }
    @media only screen and (max-width: 448px){
        .field-row label{
            width: var(--fe-field-label-width-tiny, var(--fe-field-label-width-narrow, 9.6rem));
        }
    }
</style>
