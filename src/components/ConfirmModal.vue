<template>
    <dialog :id="props.id">
        <div class="ConfirmModal-container">
            <h2>{{ data.title }}
                <span @click="closeModal()" class="close">&times;</span>
            </h2>
            <p>{{ data.message }}</p>
            <button @click="closeModal()">{{ data.btnNo}}</button>
            <button @click="data.accept(data.dialog)">{{ data.btnYes }}</button>
        </div>
    </dialog>
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
 *       onConfirm: (dialog) => {
 *           this.deleteLocalFlower(this.id);
 *           dialog.close();
 *       },
 *   });
 */
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

onMounted(() => {
    data.dialog = document.getElementById(props.id);
    props.channel.on(props.on, (e) => {
        data.title = e.title;
        data.message = e.message;
        data.btnNo = e.btnNo;
        data.btnYes = e.btnYes;
        data.accept = e.onConfirm;
        openModal();
    });
});

onBeforeUnmount(() => {
    props.channel.off(props.on);
});

</script>

<style scoped>
    .ConfirmModal-container{
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
    .ConfirmModal-container button{
        background-color: green;
        color: lightgreen;
        border-color: lightgreen;
        position: relative;
        left:35%;
        margin-bottom: 10px;
        margin-left: 5px;
    }
    .close{
        color: lightgreen;
        margin-right: 5%;
        float: right;
        font-size: 38px;
        font-weight: bold;
    }
    .close:hover,
    .close:focus{
        color: black;
        text-decoration: none;
        cursor: pointer;
    }
    .ConfirmModal-container p{
        font-size: 26px;
        overflow: auto;
    }
    ::backdrop{
        background-color: white;
        opacity: 0.55;
    }
</style>