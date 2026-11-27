<template>
  <ModalDialog :id="props.id" ref="dialog" size="fit">
    <h1> {{ data.title }}</h1>
    <div id="progress-bar">
      <div id="Bar" />
    </div>
    <h1> {{ getProgress }} / {{ data.total }}</h1>
  </ModalDialog>
</template>

<script setup>
/**
 * ProgressModal Component
 * Vue component for progress bar.
 * 
 * @component ProgressModal
 * @prop {String} id - The unique identifier for the modal dialog.
 * @prop {Object} channel - The communication channel to listen for events.
 * @prop {String} on - The event to listen for on the channel (for opening the modal).
 * @prop {String} update - The event to listen for updating the progress, it will close the dialog when progress == total.
 * 
 * @example
 * // Component usage in another component, view, etc.
 * <template>
 *    <ProgressModal :channel="emitter" :id="'progressBar'" :on="'showProgress'" :update="'updateProgress'" />
 * </template>
 * 
 * // Some other component opening the modal
 *  emitter.emit('showProgress', {
 *     title: 'Action title',
 *     progress: 0,
 *     total: 100, // Set the total progress steps
 *     onLoad: () => {
 *         // function to execute when opened
 *         // process data, send data to web worker, etc
 *         // emit updates for this progressModal
 *     },
 * });
 * 
 * // Some other component updating the progress
 *  emitter.emit('updateProgress', {
 *     progress: 50, // Update the progress value
 * });
 */
import { reactive, ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { listen } from '../services/listen';
import ModalDialog from './ui/ModalDialog.vue';

const props = defineProps({
    id: {
        type: String,
        required: true
    },
    channel: {
        type: Object,
        required: true
    },
    on: {
        type: String,
        required: true
    },
    update: {
        type: String,
        required: true
    }
});

const data = reactive({
    title: "",
    progress: 0,
    total: 0,
});
const dialog = ref(null);
const getProgress = computed(() => {
    return data.progress;
});
const updateBar = () =>{
    const bar = document.getElementById("Bar");
    let width = ((data.progress / data.total) * 100) + "%"
    bar.setAttribute("style", "width: " + width + "; background-color: var(--fe-lightgreen); height: 3.125rem;");
};

const stops = [];

onMounted(() => {
    stops.push(listen(props.channel, props.on, (e) => {
        data.title = e.title;
        data.progress = e.progress;
        data.total = e.total;
        openModal();
        e.onLoad();
    }));
    stops.push(listen(props.channel, props.update, (e) => {
        data.progress = e.progress;
        updateBar();
        if(data.progress == data.total){
            closeModal();
        }
    }));
});

onBeforeUnmount(() => {
    stops.splice(0).forEach((stop) => stop());
});

const openModal = () => {
    dialog.value.open();
};

const closeModal = () => {
    dialog.value.close();
};

</script>

<style scoped>
    #progress-bar{
        background-color: var(--fe-progress-track);
        box-shadow: inset 0rem 0rem 0.6rem 0.125rem var(--fe-black);
        margin: 0.6rem;
    }
    @media only screen and (max-width: 1280px){
        h1{
            font-size: 0.9rem;
        }
    }
</style>
