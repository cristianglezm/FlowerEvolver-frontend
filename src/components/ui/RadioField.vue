<template>
  <span class="radio-field">
    <input
      :id="inputId" class="choice radio" type="radio" :name="name" :value="value" :checked="model === value"
      :disabled="disabled" :data-testid="testid" @change="choose"
    >
    <label :for="inputId">{{ label }}</label>
  </span>
</template>

<script setup>
/**
 * One round box of a group, with the text after it. The ones of a group have the same `name` and the same `v-model`,
 * and each its own `value`; the one whose value is the model is the one that is checked. It is put in a FieldRow, which
 * has the label of the group.
 *
 * `change` is emitted when this one is chosen, with the value that the group has now.
 *
 * @component RadioField
 * @prop {String|Number|Boolean} modelValue - the value that the group has, with `v-model`.
 * @prop {String|Number|Boolean} value - the value that choosing this one gives.
 * @prop {String} name - the name of the group.
 * @prop {String} label - the text after the box.
 * @prop {String} inputId - the id of the input.
 * @prop {String} testid - the data-testid of the input.
 * @prop {Boolean} disabled - the input cannot be chosen.
 * @emits change - (value) the value that the group has now.
 */
const model = defineModel({ type: [String, Number, Boolean], default: undefined });

const props = defineProps({
    value: {
        type: [String, Number, Boolean],
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
    inputId: {
        type: String,
        required: true,
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

// the value of this one is given, not read from the model: the model of the one that has the group is a render behind
const choose = () => {
    model.value = props.value;
    emit('change', props.value);
};
</script>

<style scoped src="./choice.css"></style>
<style scoped>
    .radio-field label{
        margin-left: 0.2rem;
        margin-right: 0.6rem;
        cursor: pointer;
    }
    .radio{
        border-radius: 1.25rem;
    }
    .radio::before{
        width: 0.60em;
        height: 0.65em;
        clip-path: circle(9px);
    }
    @media only screen and (max-width: 1280px){
        .radio{
            font-size: 0.9rem;
        }
        .radio::before{
            clip-path: circle(3px);
        }
    }
</style>
