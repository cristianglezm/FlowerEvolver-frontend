<template>
  <dialog :id="props.id">
    <div class="ConfirmModal-container center">
      <div class="inlined">
        <h2>{{ data.title }}</h2>
        <span class="close" @click="nextItem()">&times;</span>
      </div>
      <p style="text-align: center;">{{ data.message }}</p>
      <div>
        <button @click="nextItem()">{{ data.btnNo }}</button>
        <button @click="data.accept(); nextItem()">{{ data.btnYes }}</button>
      </div>
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
 *       onConfirm: () => {
 *           this.deleteLocalFlower(this.id);
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
const nextItem = () => {
    if(data.queue.length > 0){
        let item = data.queue.pop();
        data.title = item.title;
        data.message = item.message;
        data.btnNo = item.btnNo;
        data.btnYes = item.btnYes;
        data.accept = item.onConfirm;
    }else{
        closeModal();
    }
};
onMounted(() => {
    data.dialog = document.getElementById(props.id);
    data.queue = new Array();
    props.channel.on(props.on, (e) => {
        if(data.queue.length > 0){
            data.queue.push(e);
        }else{
            data.queue.push(e);
            setTimeout(() => {
                nextItem();
                openModal();
            }, 20);
        }
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
    .ConfirmModal-container{
        background-color: green;
        color: lightgreen;
        position: fixed;
        border: solid;
        border-color: lightgreen;
        border-radius: 0.31rem;
        box-shadow: 0rem 2rem 4rem 0rem rgba(0,0,0,1);
        overflow: auto;
        overflow-wrap: break-word;
        z-index: 1;
        padding: 0.125rem;
        width: 50%;
        display: flex;
        flex-flow: column nowrap;
        text-align: center;
        margin: auto;
        box-sizing: content-box;
    }
    .ConfirmModal-container p{
        overflow: auto;
        overflow-wrap: break-word;
        font-size: 1.6rem;
    }
    .ConfirmModal-container button{
        background-color: green;
        color: lightgreen;
        border-color: lightgreen;
        position: relative;
        margin-bottom: 0.6rem;
        cursor: pointer;
        margin-left: 0.31rem;
        font-size: 1.25rem;
        border-radius: 2.1rem;
    }
    @media only screen and (max-width: 1280px){
        .ConfirmModal-container{
            width: 90%;
        }
        .ConfirmModal-container button{
            transform: translate(20%);
            font-size: 0.9rem;
        }
        .ConfirmModal-container p{
            font-size: 0.9rem;
        }
        .inlined h2{
            font-size: 1.2rem;
        }
    }
    .ConfirmModal-container button:hover{
        border-color: green;
        background-color: lightgreen;
        color: green;
    }
    .close{
        color: lightgreen;
        margin-right: 1%;
        float: right;
        font-size: 2.3rem;
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
