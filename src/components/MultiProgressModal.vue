<template>
  <ModalDialog :id="props.id" ref="dialog" size="fit" tall aria-labelledby="modalTitle" role="dialog" aria-modal="true">
    <div>
      <h1 id="modalTitle">{{ data.title }}</h1>
    </div>
    <div v-if="data.items.size">
      <div v-for="[key, item] of data.items" :key="key" role="region" :aria-labelledby="'progress-title-' + item.name">
        <h2 id="'progress-title-' + item.name"> {{ item.name }} </h2>
        <div :id="'multiProgress-bar-' + item.name" class="bar-background" role="progressbar" :aria-valuenow="getProgress(item.name)" :aria-valuemin="0" :aria-valuemax="item.total" :aria-labelledby="'progress-title-' + item.name">
          <div :id="'Bar-' + item.name" />
        </div>
        <div>
          <h1> {{ getProgress(item.name).toFixed(2) }} / {{ item.total }}</h1>
        </div>
      </div>
    </div>
  </ModalDialog>
</template>

<script setup>
/**
 * MultiProgressModal Component
 * Vue component for displaying and tracking multiple progress bars within a modal dialog.
 * 
 * @component MultiProgressModal
 * @prop {String} id - The unique identifier for the modal dialog.
 * @prop {Object} channel - The communication channel (e.g., an event emitter) to listen for events.
 * @prop {String} on - The event to listen for when opening the modal and initializing progress items.
 * 
 * @example
 * // Usage in another component or view
 * <template>
 *    <MultiProgressModal :channel="emitter" :id="'multiProgressBar'" :on="'showMultiProgress'" />
 * </template>
 * 
 * // Emitting events to manage the progress bars
 * emitter.emit('showMultiProgress', {
 *    status: 'setup',
 *    title: 'Processing Multiple Tasks',
 *    onLoad: () => {
 *        // Function to execute when the modal is opened
 *        // This could involve processing data or other setup tasks
 *    },
 * });
 * 
 * emitter.emit('showMultiProgress', {
 *    status: 'init',
 *    name: 'Task 1',
 *    progress: 0,
 *    total: 100, // Total steps for Task 1
 * });
 * emitter.emit('showMultiProgress', {
 *    status: 'init',
 *    name: 'Task 2',
 *    progress: 0,
 *    total: 100, // Total steps for Task 2
 * });
 * emitter.emit('showMultiProgress', {
 *    status: 'update',
 *    name: 'Task 1',
 *    progress: 50, // Update the progress for Task 1
 * });
 * emitter.emit('showMultiProgress', {
 *    status: 'update',
 *    name: 'Task 2',
 *    progress: 50, // Update the progress for Task 2
 * });
 * // the modal closes itself when all tasks are completed.
 * emitter.emit('showMultiProgress', {
 *    status: 'update',
 *    name: 'Task 1',
 *    progress: 100, // Final progress value for Task 1
 * });
 */
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
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
    }
});
const data = reactive({
    title: "loading title..",
    items: new Map()
});

const dialog = ref(null);
const getProgress = (key) => {
    return data.items.get(key).progress;
};
const updateBar = (key) =>{
    let item = data.items.get(key);
    let width = ((item.progress / item.total) * 100) + "%"
    const bar = document.getElementById("Bar-" + key);
    if(bar){
        bar.setAttribute("style", "width: " + width + "; background-color: var(--fe-lightgreen); height: 3.125rem;");
    }
};

const stops = [];

onMounted(() => {
    data.items = new Map();
    stops.push(listen(props.channel, props.on, (e) => {
        switch(e.status){
            case "setup":{
                data.title = e.title;
                openModal();
                e.onLoad();
            }
                break;
            case "init":{
                data.items.set(e.name, e);
                updateBar(e.name);
            }
                break;
            case "update":{
                let item = data.items.get(e.name);
                item.progress = e.progress;
                updateBar(e.name);
                let done = true;
                data.items.forEach((item, _, map) => {
                    if(item.progress != item.total){
                        done = false;
                    }else{
                        map.delete(item.name);
                    }
                });
                if(done){
                    closeModal();
                }
            }
                break;
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
    .bar-background{
        background-color: var(--fe-progress-track);
        box-shadow: inset 0rem 0rem 0.6rem 0.125rem var(--fe-black);
        margin: 0.6rem;
    }
    @media only screen and (max-width: 1280px){
        h1, h2{
            font-size: 0.9rem;
        }
    }
</style>
