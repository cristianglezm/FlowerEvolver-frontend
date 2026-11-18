<template>
  <dialog ref="element" class="fe-modal" :class="[size, { tall }]" @cancel="keepOpenWhileLocked($event)" @close="emit('close')">
    <div v-if="title !== ''" class="fe-modal-header">
      <h2>{{ title }}</h2>
      <button v-if="closable" class="fe-modal-close" type="button" aria-label="Close" :disabled="locked" @click="emit('dismiss')">
        &times;
      </button>
    </div>
    <slot />
  </dialog>
</template>

<script setup>
/**
 * The dialog of the application: a green box over a pale backdrop, that holds what it is given.
 *
 * It does not know what it is for. The one that has it opens it with `open()` and closes it with `close()`, and it
 * says `close` when it was closed, in any way (Esc included), so that what has to be put back is put back in one place.
 * Its attributes (`id`, `data-testid`) are the ones of the <dialog>.
 *
 * With a `title` it has a header, and with `closable` the header has a × that says `dismiss`: it does not close the
 * dialog itself, because what dismissing is (the next question of a queue, a reset) is for the one that has it.
 *
 * While it is `locked` Esc does not close it and the × cannot be pressed. It is for what is running behind it. `close()`
 * still closes it, the one that has it knows when it can.
 *
 * @component ModalDialog
 * @prop {String} title - the heading, none when it is not said.
 * @prop {Boolean} closable - a × in the header, it needs a title.
 * @prop {Boolean} locked - Esc and the × do not close it.
 * @prop {String} size - `wide`, half of the window (most of it on a narrow one); `fit`, as wide as what it holds;
 *   `form`, a narrow one for a few fields.
 * @prop {Boolean} tall - as high as the window allows.
 * @emits close - it was closed, by whatever.
 * @emits dismiss - the × was pressed.
 * @expose open, close
 */
import { ref } from 'vue';

const props = defineProps({
    title: {
        type: String,
        default: '',
    },
    closable: {
        type: Boolean,
        default: false,
    },
    locked: {
        type: Boolean,
        default: false,
    },
    size: {
        type: String,
        default: 'wide',
        validator: (value) => ['wide', 'fit', 'form'].includes(value),
    },
    tall: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits(['close', 'dismiss']);

const element = ref(null);
const open = () => {
    element.value.showModal();
};
const close = () => {
    element.value.close();
};
// Esc closes a dialog, and what is running would go on behind it
const keepOpenWhileLocked = (event) => {
    if(props.locked){
        event.preventDefault();
    }
};

defineExpose({ open, close });
</script>

<style scoped>
    .fe-modal{
        background-color: var(--fe-green);
        color: var(--fe-lightgreen);
        border: solid var(--fe-lightgreen);
        border-radius: 0.31rem;
        box-shadow: 0rem 2rem 4rem 0rem rgba(0, 0, 0, 1);
        overflow: auto;
        overflow-wrap: break-word;
        padding: 0.125rem;
        text-align: center;
        box-sizing: content-box;
    }
    /* only when it is open: a display of its own would show a dialog that is closed */
    .fe-modal[open]{
        display: flex;
        flex-flow: column nowrap;
    }
    .wide{
        width: 50%;
        max-width: 90%;
        max-height: 90%;
    }
    .fit{
        width: fit-content;
    }
    .form{
        width: min(36rem, 92vw);
    }
    .tall{
        height: 90%;
    }
    .fe-modal-header{
        display: flex;
        flex-flow: row nowrap;
    }
    .fe-modal-header h2{
        width: 100%;
        align-self: center;
    }
    .fe-modal-close{
        color: var(--fe-lightgreen);
        background: none;
        border: none;
        padding: 0;
        margin-right: 1%;
        font-size: 2.3rem;
        font-weight: bold;
        line-height: 1;
        cursor: pointer;
    }
    .fe-modal-close:hover:not(:disabled),
    .fe-modal-close:focus-visible{
        color: var(--fe-black);
    }
    .fe-modal-close:disabled{
        opacity: 0.5;
        cursor: not-allowed;
    }
    @media only screen and (max-width: 1280px){
        .wide, .fit{
            width: 90%;
        }
        .fe-modal-header h2{
            font-size: 1.2rem;
        }
    }
    /* a literal: the custom properties of the dialog do not always reach its backdrop */
    .fe-modal::backdrop{
        background-color: white;
        opacity: 0.55;
    }
</style>
