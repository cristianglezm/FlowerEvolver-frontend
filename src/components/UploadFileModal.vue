<template>
    <dialog :id="props.id">
        <div class="uploadFile-container center">
            <div class="inlined">
                <h2>{{ data.title }} </h2>
                <span @click="closeModal()" class="close">&times;</span>
            </div>
            <label for="uploadFiles" class="FileInput">
                <input id="uploadFiles" type="file" multiple accept="application/json" @change="updateMessage()"/>
                <p>{{ data.message }}</p>
            </label>
            <div>
                <button @click="closeModal()">{{ data.btnCancel}}</button>
                <button @click="data.onUpload(data.dialog, data.files.files)">{{ data.btnUpload }}</button>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { reactive, onMounted, onBeforeUnmount } from 'vue';

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

const openModal = () => {
    data.dialog.showModal();
};

const closeModal = () => {
    data.dialog.close();
};
const updateMessage = () => {
    let length = data.files.files.length;
    data.message = length + " files selected (";
    for(let i = 0;i<length; ++i){
        data.message += data.files.files[i].name;
        if(i != length - 1){
            data.message += ", ";
        }
    }
    data.message += ")";
};
onMounted(() => {
    data.message = "select files to import (Flower, Generation, Session)";
    data.dialog = document.getElementById(props.id);
    data.files = document.getElementById("uploadFiles");
    props.channel.on(props.on, (e) => {
        data.title = e.title;
        data.btnCancel = e.btnCancel;
        data.btnUpload = e.btnUpload;
        data.onUpload = e.onUpload;
        openModal();
    });
});

onBeforeUnmount(() => {
    props.channel.off(props.on);
});
</script>

<style scoped>
    .inlined{
        display: flex;
        flex-flow: row nowrap;
    }
    .inlined h2{
        width: 100%;
    }
    .center{
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }
    .uploadFile-container{
        background-color: green;
        color: lightgreen;
        position: fixed;
        border: solid;
        border-color: lightgreen;
        border-radius: 0.31rem;
        box-shadow: 0rem 1rem 2rem 0rem black;
        overflow: auto;
        overflow-wrap: break-word;
        z-index: 1;
        padding: 0.12rem;
    }
    .FileInput{
        display: inline-block;
        background-color: green;
        border: solid lightgreen;
        margin: 0.6rem;
        padding: 0.3rem 0.6rem;
        cursor: pointer;
        overflow: auto;
        overflow-wrap: break-word;
        box-shadow: inset 0rem 0rem 0.6rem 0.125rem black;
    }
    .FileInput input{
        display: none;
    }
    .uploadFile-container p{
        overflow: auto;
        overflow-wrap: break-word;
    }
    .uploadFile-container button{
        background-color: green;
        color: lightgreen;
        border-color: lightgreen;
        position: relative;
        left: 40%;
        cursor: pointer;
        margin-bottom: 0.6rem;
        margin-left: 0.31rem;
        font-size: 1.25rem;
        border-radius: 2.1rem;
    }
    .uploadFile-container button:hover{
        border-color: green;
        background-color: lightgreen;
        color: green;
    }
    .close{
        color: lightgreen;
        margin-right: 1%;
        float: right;
        font-size: 2.37rem;
        font-weight: bold;
    }
    .close:hover,
    .close:focus{
        color: black;
        text-decoration: none;
        cursor: pointer;
    }
    ::backdrop{
        background-color: white;
        opacity: 0.55;
    }
</style>