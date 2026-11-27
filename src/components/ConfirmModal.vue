<template>
  <ModalDialog :id="props.id" ref="dialog" :title="data.title" closable @dismiss="nextItem()">
    <p>{{ data.message }}</p>
    <div class="actions">
      <SafeButton data-testid="confirm-no" @click="nextItem()">{{ data.btnNo }}</SafeButton>
      <SafeButton data-testid="confirm-yes" @click="data.accept(); nextItem()">{{ data.btnYes }}</SafeButton>
    </div>
  </ModalDialog>
</template>

<script setup>
/**
 * ConfirmModal Component
 * Vue component for a confirmation modal dialog.
 * 
 * @prop {String} id - The unique identifier for the modal dialog.
 * @prop {Object} channel - The communication channel to listen for events.
 * @prop {String} on - The event to listen for on the channel.
 * 
 * @example
 * // component usage in another component, view etc
 * <template>
 *      <ConfirmModal :channel="emitter" :id="'globalConfirm'" :on="'showYesNo'" />
 * </template>
 * // some other component sending info
 *   emitter.emit('showYesNo', {
 *       title: 'Delete Action',
 *       message: 'Do you wanna delete flower ' + this.id + '?',
 *       btnNo: 'No',
 *       btnYes: 'Delete Flower',
 *       onConfirm: () => {
 *           this.deleteLocalFlower(this.id);
 *       },
 *   });
 */
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { listen } from '../services/listen';
import ModalDialog from './ui/ModalDialog.vue';
import SafeButton from './ui/SafeButton.vue';

const props = defineProps({
    id:{
        type: String,
        required: true,
    },
    channel:{
        type: Object,
        required: true,
    },
    on:{
        type: String,
        required: true,
    },
});
const data = reactive({});
const dialog = ref(null);

const openModal = () => {
    dialog.value.open();
};

const closeModal = () => {
    dialog.value.close();
};
// Whether a question is on screen, or about to be: one that comes then waits its turn.
let busy = false;
const nextItem = () => {
    if(data.queue.length > 0){
        let item = data.queue.shift();
        data.title = item.title;
        data.message = item.message;
        data.btnNo = item.btnNo;
        data.btnYes = item.btnYes;
        data.accept = item.onConfirm;
    }else{
        busy = false;
        closeModal();
    }
};
const stops = [];
onMounted(() => {
    data.queue = new Array();
    stops.push(listen(props.channel, props.on, (e) => {
        data.queue.push(e);
        if(!busy){
            busy = true;
            setTimeout(() => {
                nextItem();
                openModal();
            }, 20);
        }
    }));
});

onBeforeUnmount(() => {
    stops.splice(0).forEach((stop) => stop());
});

</script>

<style scoped>
    p{
        overflow: auto;
        overflow-wrap: break-word;
        font-size: 1.6rem;
    }
    .actions{
        --fe-button-margin: 0 0.31rem 0.6rem 0.31rem;
    }
    @media only screen and (max-width: 1280px){
        p{
            font-size: 0.9rem;
        }
    }
</style>
