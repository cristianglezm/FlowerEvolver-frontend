<template>
  <FieldRow :label="label" :tooltip="tooltip" :input-id="inputId">
    <input
      :id="inputId" class="choice checkbox" type="checkbox" :checked="model" :disabled="disabled"
      :data-testid="testid" @change="onChange"
    >
  </FieldRow>
</template>

<script setup>
/**
 * A box to check, with its tooltip and its label, for the options that are on or off.
 *
 * The value is the one of `v-model`. When the box is clicked it is set first and then `change` is emitted with it, so
 * what the one that has the field does with the new value (saving it, say) finds it already there. The box always ends
 * showing what the owner has: if the owner does not take the value, the box goes back.
 *
 * @component CheckboxField
 * @prop {Boolean} modelValue - whether it is checked, with `v-model`.
 * @prop {String} label - the text of the label.
 * @prop {String} inputId - the id of the input.
 * @prop {String} tooltip - what the tooltip says, none when it is empty.
 * @prop {String} testid - the data-testid of the input.
 * @prop {Boolean} disabled - the input cannot be used.
 * @emits change - (checked) the value that it has now.
 */
import FieldRow from './FieldRow.vue';

const model = defineModel({ type: Boolean, default: false });

defineProps({
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

// what is emitted is what the box says, not what the model says: the one that has the field gets the new value a
// render later, and a model that is read back now is the old one
const onChange = (event) => {
    const checked = event.target.checked;
    model.value = checked;
    emit('change', checked);
    // The box has been ticked by the browser, and the one that has the field may not take it, or take the opposite at
    // once (a browser that cannot keep the storage): if it ends with the value that it had, nothing has changed for Vue
    // and the box would stay as the browser left it. The model is the value that was last shown, until the owner has
    // rendered another, so the box is put back to it, and Vue changes it again if the owner has a new one.
    event.target.checked = model.value;
};
</script>

<style scoped src="./choice.css"></style>
<style scoped>
    .checkbox::before{
        width: 0.65em;
        height: 0.65em;
        clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
    }
</style>
