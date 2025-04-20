<template>
  <dialog :id="props.id" style="overflow: auto;" aria-labelledby="modalTitle" role="dialog" aria-modal="true">
    <div class="center multiProgress-container">
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
    </div>
  </dialog>
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
import { reactive, onMounted, onBeforeUnmount } from 'vue';

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

const getProgress = (key) => {
    return data.items.get(key).progress;
};
const updateBar = (key) =>{
    let item = data.items.get(key);
    let width = ((item.progress / item.total) * 100) + "%"
    const bar = document.getElementById("Bar-" + key);
    if(bar){
        bar.setAttribute("style", "width: " + width + "; background-color: lightgreen; height: 3.125rem;");
    }
};

onMounted(() => {
    data.items = new Map();
    data.dialog = document.getElementById(props.id);
    props.channel.on(props.on, (e) => {
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
    });
});

onBeforeUnmount(() => {
    props.channel.off(props.on);
});

const openModal = () => {
    data.dialog.showModal();
};

const closeModal = () => {
    data.dialog.close();
};

</script>

<style scoped>
    .center{
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }
    .multiProgress-container{
        background-color: green;
        color: lightgreen;
        position: fixed;
        border: solid lightgreen;
        border-radius: 0.31rem;
        box-shadow: 0rem 1rem 2rem 0rem rgba(0,0,0,0.3);
        overflow: auto;
        z-index: 1;
        padding: 0.125rem;
        text-align: center;
        height: 90%;
        margin: auto;
        box-sizing: content-box;
    }
    @media only screen and (max-width: 1280px){
        .multiProgress-container{
            width: 90%;
        }
        h1, h2{
            font-size: 0.9rem;
        }
    }
    .bar-background{
        background-color: rgba(4, 97, 43, 0.986);
        box-shadow: inset 0rem 0rem 0.6rem 0.125rem black;
        margin: 0.6rem;
    }
    ::backdrop{
        background-color: white;
        opacity: 0.55;
    }
</style>
