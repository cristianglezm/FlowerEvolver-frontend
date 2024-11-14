<template>
  <dialog :id="props.id">
    <div class="descriptionModal-container center">
      <div class="inlined">
        <h2>Flower {{ data.FlowerID }}</h2>
        <span class="close" @click="closeModal()">&times;</span>
      </div>
      <img id="descForFlower" loading="lazy" :src="data.FlowerImage" :alt="data.description" class="FlowerImage">
      <div v-if="data.loading" class="loadingEffect">
        <p style="text-align: center;"><strong> processing </strong></p>
      </div>
      <div v-else class="description-caption">
        <p>{{ data.description }}</p>
      </div>
      <div>
        <button @click="closeModal()"> Ok. </button>
      </div>
    </div>
  </dialog>
</template>

<script setup>
/**
 * DescriptionModal Component
 * Vue component for displaying a modal dialog with a flower's image and description.
 * 
 * @component DescriptionModal
 * @prop {String} id - The unique identifier for the modal dialog.
 * @prop {Object} channel - The communication channel to listen for events.
 * @prop {String} on - The event to listen for on the channel (for opening the modal).
 * @prop {String} update - The event to listen for to update the description content.
 * 
 * @example
 * // Component usage in another component, view, etc.
 * <template>
 *    <DescriptionModal :channel="emitter" :id="'flowerDescription'" :on="'showFlowerDescription'" :update="'updateFlowerDescription'" />
 * </template>
 * 
 * // Some other component opening the modal
 * emitter.emit('showFlowerDescription', {
 *    FlowerImage: 'https://example.com/flowers/42.png',
 *    FlowerID: 42,
 * });
 * 
 * // Some other component updating the modal content
 * emitter.emit('updateFlowerDescription', {
 *    loading: false,
 *    description: 'A beautiful flower description.',
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
    },
    update: {
        type: String,
        required: true
    }
});

const data = reactive({
    FlowerImage: "",
    loading: true,
    description: "processing",
});

onMounted(() => {
    props.channel.on(props.on, (e) => {
        data.FlowerImage = e.FlowerImage;
        data.FlowerID = e.FlowerID;
        openModal();
    });
    props.channel.on(props.update, (e) => {
        data.loading = e.loading;
        data.description = e.description;
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
    data.loading = true;
    data.description = "processing";
    data.dialog.close();
};

</script>

<style scoped>
    .loadingEffect {
        animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both infinite;
        transform: translate3d(0, 0, 0);
    }

    @keyframes shake {
        10%, 90%{
            transform: translate3d(-1px, 0, 0);
        }

        20%, 80%{
            transform: translate3d(2px, 0, 0);
        }

        30%, 50%, 70%{
            transform: translate3d(-4px, 0, 0);
        }

        40%, 60%{
            transform: translate3d(4px, 0, 0);
        }
    }
    .FlowerImage{
        width: 25%;
        height: 25%;
        align-self: center;
    }
    .inlined{
        display: flex;
        flex-flow: row nowrap;
    }
    .inlined h2{
        width: 100%;
        align-self: center;
    }
    .center{
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }
    .descriptionModal-container{
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
        max-width: 90%;
        max-height: 90%;
        display: flex;
        flex-flow: column nowrap;
        text-align: center;
    }
    .descriptionModal-container p{
        overflow: auto;
        overflow-wrap: break-word;
        font-size: 1.6rem;
    }
    .descriptionModal-container button{
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
    .description-caption{
        overflow: auto;
        overflow-wrap: break-word;
        padding-left: 1rem;
        padding-right: 1rem;
        text-align: center;
    }
    @media only screen and (max-width: 1280px){
        .descriptionModal-container{
            width: 90%;
        }
        .descriptionModal-container button{
            transform: translate(20%);
            font-size: 0.9rem;
        }
        .descriptionModal-container p{
            font-size: 0.9rem;
        }
        .inlined h2{
            font-size: 1.2rem;
        }
    }
    .descriptionModal-container button:hover{
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
