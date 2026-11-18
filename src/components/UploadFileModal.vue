<template>
  <ModalDialog :id="props.id" ref="dialog" :title="data.title" closable @dismiss="closeModal()">
    <label for="uploadFiles" class="FileInput">
      <input id="uploadFiles" ref="fileInput" type="file" multiple accept="application/json, .json" @change="updateMessage()">
      <p>{{ data.message }}</p>
    </label>
    <div class="actions">
      <SafeButton @click="closeModal()">{{ data.btnCancel }}</SafeButton>
      <SafeButton @click="validateFileType()">{{ data.btnUpload }}</SafeButton>
    </div>
  </ModalDialog>
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
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { listen } from '../services/listen';
import ModalDialog from './ui/ModalDialog.vue';
import SafeButton from './ui/SafeButton.vue';
import { useErrorStore } from '../stores/ErrorStore';

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
const fileInput = ref(null);

const ErrorStore = useErrorStore();

const openModal = () => {
    dialog.value.open();
};

const closeModal = () => {
    dialog.value.close();
};
const updateMessage = () => {
    let length = fileInput.value.files.length;
    data.message = length + " files selected (";
    for(let i = 0;i<length; ++i){
        data.message += fileInput.value.files[i].name;
        if(i != length - 1){
            data.message += ", ";
        }
    }
    data.message += ")";
};
const validateFileType = () => {
    const allowedTypes = ['application/json', '.json'];
    let length = fileInput.value.files.length;
    let valid = true;
    let notValidFile = '';
    for(let i = 0;i<length;++i){
        let type = fileInput.value.files[i].type;
        if(!allowedTypes.includes(type)){
            valid = false;
            notValidFile = fileInput.value.files[i].name;
        }
    }
    if(valid){
        data.onUpload(dialog.value, fileInput.value.files);
    }else{
        closeModal();
        ErrorStore.push(notValidFile + " file was not valid, valid files are (.json)");
    }
};
const stops = [];
onMounted(() => {
    data.message = "select files to import (Flower, Generation, Session)";
    stops.push(listen(props.channel, props.on, (e) => {
        data.title = e.title;
        data.btnCancel = e.btnCancel;
        data.btnUpload = e.btnUpload;
        data.onUpload = e.onUpload;
        openModal();
    }));
});

onBeforeUnmount(() => {
    stops.splice(0).forEach((stop) => stop());
});
</script>

<style scoped>
    .FileInput{
        display: inline-block;
        background-color: var(--fe-green);
        border: solid var(--fe-lightgreen);
        margin: 0.6rem;
        padding: 0.3rem 0.6rem;
        cursor: pointer;
        overflow: auto;
        overflow-wrap: break-word;
        box-shadow: inset 0rem 0rem 0.6rem 0.125rem var(--fe-black);
    }
    .FileInput input{
        display: none;
    }
    p{
        overflow: auto;
        overflow-wrap: break-word;
    }
    .actions{
        --fe-button-margin: 0 0.31rem 0.6rem 0.31rem;
    }
</style>
