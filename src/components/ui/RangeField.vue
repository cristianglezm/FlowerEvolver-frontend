<template>
  <FieldRow :label="label" :tooltip="tooltip" :input-id="inputId">
    <input
      :id="inputId" v-model.number="slider" class="range-input" type="range" :min="sliderMin" :max="sliderMax"
      :step="sliderStep" :disabled="disabled" :data-testid="testid" @change="onChange"
    >
    <span class="range-value">{{ text }}</span>
  </FieldRow>
</template>

<script setup>
/**
 * A slider, with its tooltip, its label and what its value is, written after it.
 *
 * `percent` is for a value from 0 to 1 that is easier to understand as a percentage: the slider goes from 0 to 100,
 * the text says `35%`, and `v-model` keeps the value from 0 to 1. `min`, `max` and `step` are always in the units of
 * `v-model` (`:step="0.01"` is a step of 1%).
 *
 * `v-model` is updated while the slider moves, and `change` is emitted when it is let go, with the value, for what is
 * to be done with a value that is final (saving it).
 *
 * @component RangeField
 * @prop {Number} modelValue - the value, with `v-model`.
 * @prop {String} label - the text of the label.
 * @prop {String} inputId - the id of the input.
 * @prop {String} tooltip - what the tooltip says, none when it is empty.
 * @prop {Number} min - the smallest value.
 * @prop {Number} max - the biggest value.
 * @prop {Number} step - the distance between two values.
 * @prop {Boolean} percent - the value is from 0 to 1 and it is shown from 0 to 100%.
 * @prop {String} suffix - what is written after the value ("x" for a zoom), when it is not a percent.
 * @prop {Function} format - (value) => the text after the slider, in place of the value and the suffix.
 * @prop {String} testid - the data-testid of the input.
 * @prop {Boolean} disabled - the slider cannot be used.
 * @emits change - (value) the value, when the slider is let go.
 *
 * The width of the slider is `--fe-range-width` (10%) and `--fe-range-width-narrow` (up to 1280px, 10% too) on any
 * element above it.
 */
import { computed, ref, watch } from 'vue';
import FieldRow from './FieldRow.vue';

const model = defineModel({ type: Number, default: 0 });

const props = defineProps({
    label: {
        type: String,
        required: true,
    },
    inputId: {
        type: String,
        required: true,
    },
    tooltip: {
        type: String,
        default: '',
    },
    min: {
        type: Number,
        default: 0,
    },
    max: {
        type: Number,
        default: 100,
    },
    step: {
        type: Number,
        default: 1,
    },
    percent: {
        type: Boolean,
        default: false,
    },
    suffix: {
        type: String,
        default: '',
    },
    format: {
        type: Function,
        default: undefined,
    },
    testid: {
        type: String,
        default: undefined,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits(['change']);

// what the slider goes through, which is a whole number from 0 to 100 for a percent
const scale = computed(() => props.percent ? 100 : 1);
const sliderMin = computed(() => Math.round(props.min * scale.value));
const sliderMax = computed(() => Math.round(props.max * scale.value));
const sliderStep = computed(() => Math.max(1, Math.round(props.step * scale.value)));
// The value that the slider is at. The parent gets it as it moves, but its own value reaches the slider a moment
// later, so what is shown and said when it is let go is this one and not the one of the parent.
const current = ref(model.value);
watch(model, (value) => {
    current.value = value;
});
const slider = computed({
    get: () => Math.round(current.value * scale.value),
    set: (value) => {
        current.value = props.percent ? value / 100 : value;
        model.value = current.value;
    },
});
const text = computed(() => {
    if(props.format !== undefined){
        return props.format(current.value);
    }
    // a value that is not a whole percent shows what it is: 12.3%
    return props.percent ? `${Math.round(current.value * 1000) / 10}%` : `${current.value}${props.suffix}`;
});

const onChange = () => {
    emit('change', current.value);
};
</script>

<style scoped>
    .range-input{
        background-color: transparent;
        vertical-align: top;
        width: var(--fe-range-width, 10%);
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
    }
    @media only screen and (max-width: 1280px){
        .range-input{
            width: var(--fe-range-width-narrow, var(--fe-range-width, 10%));
        }
    }
    .range-input::-webkit-slider-runnable-track{
        background-color: var(--fe-lightgreen);
        height: 4px;
    }
    .range-input::-moz-range-track{
        background-color: var(--fe-lightgreen);
        height: 4px;
    }
    .range-input::-ms-track{
        background-color: transparent;
        border-color: transparent;
        color: transparent;
        height: 4px;
    }
    .range-input::-ms-fill-lower{
        background-color: var(--fe-lightgreen);
    }
    .range-input::-ms-fill-upper{
        background-color: transparent;
    }
    .range-input::-webkit-slider-thumb{
        background-color: var(--fe-green);
        border: 2px solid var(--fe-lightgreen);
        cursor: pointer;
        transform: scale(1.5);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        -webkit-appearance: none;
        margin-top: -6px;
        box-shadow: 1px 2px 10px 1px var(--fe-shadow);
    }
    .range-input::-moz-range-thumb{
        background-color: var(--fe-green);
        border: 2px solid var(--fe-lightgreen);
        cursor: pointer;
        transform: scale(1.5);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        -moz-appearance: none;
        box-shadow: 1px 2px 10px 1px var(--fe-shadow);
    }
    .range-input::-ms-thumb{
        background-color: var(--fe-green);
        border: 2px solid var(--fe-lightgreen);
        cursor: pointer;
        transform: scale(1.5);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        -ms-appearance: none;
        box-shadow: 1px 2px 10px 1px var(--fe-shadow);
    }
</style>
