<template>
  <dialog :id="props.id">
    <div class="uploadFile-container center">
      <div class="inlined">
        <h2>{{ data.title }} </h2>
        <span class="close" @click="closeModal()">&times;</span>
      </div>
      <label for="uploadFiles" class="FileInput">
        <input id="uploadFiles" type="file" multiple accept="application/json, .json" @change="updateMessage()">
        <p>{{ data.message }}</p>
      </label>
      <div>
        <button @click="closeModal()">{{ data.btnCancel }}</button>
        <button @click="validateFileType()">{{ data.btnUpload }}</button>
      </div>
    </div>
  </dialog>
</template>

<script setup>
/**
 * UploadFileModal Component
 * Vue component for a upload file modal dialog.
 * 
 * @component UploadFileModal
 * @prop {String} id - The unique identifier for the modal dialog.
 * @prop {Object} channel - The communication channel to listen for events.
 * @prop {String} on - The event to listen for on the channel (for opening the modal).
 * 
 * @example
 * // Component usage in another component, view, etc.
 * <template>
 *    <UploadFileModal :channel="emitter" :id="'uploadDialog'" :on="'showUploadDialog'" />
 * </template>
 * 
 * // Some other component opening the modal
 *  emitter.emit('showUploadDialog', {
 *     title: 'Upload Files',
 *     btnCancel: 'Cancel', // Text for the cancel button
 *     btnUpload: 'Upload', // Text for the upload button
 *     onUpload: (dialog, files) => {
 *         // Function to execute when files are uploaded
 *         // Process uploaded files, etc
 *         // Close the modal if needed
 *         dialog.close();
 *     },
 * });
 */
import { reactive, onMounted, onBeforeUnmount } from 'vue';
import { useFlowerStore } from '../stores/FlowerStore';

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

let FlowerStore = useFlowerStore();

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
const validateFileType = () => {
    const allowedTypes = ['application/json', '.json'];
    let length = data.files.files.length;
    let valid = true;
    let notValidFile = '';
    for(let i = 0;i<length;++i){
        let type = data.files.files[i].type;
        if(!allowedTypes.includes(type)){
            valid = false;
            notValidFile = data.files.files[i].name;
        }
    }
    if(valid){
        data.onUpload(data.dialog, data.files.files);
    }else{
        closeModal();
        FlowerStore.errors.push({message: notValidFile + " file was not valid, valid files are (.json)"});
    }
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
        text-align: center;
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
        width: 50%;
        display: flex;
        flex-flow: column nowrap;
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
        left: 35%;
        cursor: pointer;
        margin-bottom: 0.6rem;
        margin-left: 0.31rem;
        font-size: 1.25rem;
        border-radius: 2.1rem;
    }
    @media only screen and (max-width: 1280px){
        .uploadFile-container{
            width: 90%;
        }
        .uploadFile-container button{
            left: 20%;
            transform: translate(20%);
            font-size: 0.9rem;
        }
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
