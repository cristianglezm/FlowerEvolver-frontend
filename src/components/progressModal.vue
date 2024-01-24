<template>
    <dialog :id="props.id">
        <div id="progress-container">
            <div>
                <h1> {{ data.title }}</h1>
            </div>
            <div>
                <h1> {{ data.progress }} / {{ data.total }}</h1>
            </div>
        </div>
    </dialog>
</template>

<script setup>
/// @todo document, fix progress not updating
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
    }
    ::backdrop{
        background-color: white;
        opacity: 0.55;
    }
</style>
