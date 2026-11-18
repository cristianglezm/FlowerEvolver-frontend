<template>
  <FieldRow :label="label" :tooltip="tooltip" :input-id="inputId">
    <input
      :id="inputId" v-model.number="typed" class="number-input" type="number" :min="min" :max="max" :step="step"
      :disabled="disabled" :data-testid="testid" @change="onChange"
    >
  </FieldRow>
</template>

<script setup>
/**
 * A number in a pill, with its tooltip and its label.
 *
 * The value is the one of `v-model`, as it is typed: a number, or an empty string when the field is empty. When the
 * field is left (the `change` event of the input) `validate` is given the value and answers the one to keep, which is
 * what is shown and what `v-model` gets; then `change` is emitted with it, for what is to be done with a value that
 * is valid (saving it, say). Without `validate` the value is kept as it is typed.
 *
 * @component NumberField
 * @prop {Number|String} modelValue - the value, with `v-model`.
 * @prop {String} label - the text of the label.
 * @prop {String} inputId - the id of the input.
 * @prop {String} tooltip - what the tooltip says, none when it is empty.
 * @prop {Number|String} min - the smallest that the input takes, for the spinner. It does not stop what is typed.
 * @prop {Number|String} max - the biggest that the input takes, for the spinner. It does not stop what is typed.
 * @prop {Number|String} step - the step of the spinner.
 * @prop {Function} validate - (value) => the value to keep, called when the field is left.
 * @prop {String} testid - the data-testid of the input.
 * @prop {Boolean} disabled - the input cannot be used.
 * @emits change - (value) the value that is kept, after validate.
 */
import { computed, ref, watch } from 'vue';
import FieldRow from './FieldRow.vue';

const model = defineModel({ type: [Number, String], default: '' });

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
        type: [Number, String],
        default: undefined,
    },
    max: {
        type: [Number, String],
        default: undefined,
    },
    step: {
        type: [Number, String],
        default: undefined,
    },
    validate: {
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

// What the input has. The parent gets it as it changes, but its own value reaches the input a moment later, so
// what is validated when the field is left is this one and not the one of the parent.
const current = ref(model.value);
watch(model, (value) => {
    current.value = value;
});
const typed = computed({
    get: () => current.value,
    set: (value) => {
        current.value = value;
        model.value = value;
    },
});

const onChange = () => {
    const value = props.validate === undefined ? current.value : props.validate(current.value);
    typed.value = value;
    emit('change', value);
};
</script>

<style scoped>
    .number-input{
        vertical-align: top;
        background-color: var(--fe-green);
        color: var(--fe-lightgreen);
        border: solid var(--fe-lightgreen);
        border-radius: 8rem;
        margin: 0.125rem 0rem 0rem 0.125rem;
        width: var(--fe-field-control-width, 15%);
        text-align: center;
        appearance: textfield;
        box-shadow: inset 0rem 0rem 0.3rem 0.125rem var(--fe-black);
    }
    @media only screen and (max-width: 1280px){
        .number-input{
            width: var(--fe-field-control-width-narrow, 20%);
        }
    }
    @media only screen and (max-width: 448px){
        .number-input{
            width: var(--fe-field-control-width-tiny, var(--fe-field-control-width-narrow, 20%));
        }
    }
</style>
