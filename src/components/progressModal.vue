<template>
    <dialog :id="props.id">
        <div id="progress-container">
            <div>
                <h1> {{ data.title }}</h1>
            </div>
            <div id="progress-bar">
                <div id="Bar"></div>
            </div>
            <div>
                <h1> {{ getProgress }} / {{ data.total }}</h1>
            </div>
        </div>
    </dialog>
</template>

<script setup>
/**
 * progressModal Component
 * Vue component for progress bar.
 * 
 * @component progressModal
 * @prop {String} id - The unique identifier for the modal dialog.
 * @prop {Object} channel - The communication channel to listen for events.
 * @prop {String} on - The event to listen for on the channel (for opening the modal).
 * @prop {String} update - The event to listen for updating the progress, it will close the dialog when progress == total.
 * 
 * @example
 * // Component usage in another component, view, etc.
 * <template>
 *    <progressModal :channel="emitter" :id="'progressBar'" :on="'showProgress'" :update="'updateProgress'" />
 * </template>
 * 
 * // Some other component opening the modal
 *  emitter.emit('showProgress', {
 *     title: 'Delete Action',
 *     progress: 0,
 *     total: 100, // Set the total progress steps
 *     onLoad: () => {
 *         // Additional actions when modal is opened
 *     },
 * });
 * 
 * // Some other component updating the progress
 *  emitter.emit('updateProgress', {
 *     progress: 50, // Update the progress value
 * });
 */
import { reactive, onMounted, onBeforeUnmount, computed } from 'vue';

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
const getProgress = computed(() => {
    return data.progress;
});
const updateBar = () =>{
    const bar = document.getElementById("Bar");
    let width = (data.progress / data.total * 100) + "%"
    bar.setAttribute("style", "width: " + width + "; background-color: lightgreen; height: 50px;");
};

onMounted(() => {
    props.channel.on(props.on, (e) => {
        data.title = e.title;
        data.progress = e.progress;
        data.total = e.total;
        openModal();
        e.onLoad();
    });
    props.channel.on(props.update, (e) => {
        data.progress = e.progress;
        updateBar();
        if(data.progress == data.total){
            closeModal();
        }
    });
    data.dialog = document.getElementById(props.id);
});

onBeforeUnmount(() => {
    props.channel.off(props.on);
    props.channel.off(props.update);
});

const openModal = () => {
    data.dialog.showModal();
};

const closeModal = () => {
    data.dialog.close();
};

</script>

<style scoped>
    #progress-container{
        background-color: green;
        color: lightgreen;
        position: fixed;
        border: solid;
        border-color: lightgreen;
        border-radius: 5px;
        top: 40%;
        left: 40%;
        box-shadow: 0px 16px 32px 0px rgba(0,0,0,0.3);
        overflow: auto;
        z-index: 1;
        padding: 2px;
        text-align: center;
    }
    #progress-bar{
        background-color: rgba(4, 97, 43, 0.986);
    }
    ::backdrop{
        background-color: white;
        opacity: 0.55;
    }
</style>
