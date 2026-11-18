<template>
  <ModalDialog :id="props.id" ref="dialog" :title="`Flower ${data.FlowerID}`" closable @dismiss="closeModal()" @close="reset()">
    <img id="descForFlower" loading="lazy" :src="data.FlowerImage" :alt="data.description" class="FlowerImage">
    <div v-if="data.loading" class="loadingEffect">
      <p><strong> processing </strong></p>
    </div>
    <div v-else class="description-caption">
      <p>{{ data.description }}</p>
    </div>
    <div class="actions">
      <SafeButton @click="closeModal()">Ok.</SafeButton>
    </div>
  </ModalDialog>
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
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { listen } from '../services/listen';
import ModalDialog from './ui/ModalDialog.vue';
import SafeButton from './ui/SafeButton.vue';

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
    FlowerID: "",
    loading: true,
    description: "processing",
});
const dialog = ref(null);

const stops = [];

onMounted(() => {
    stops.push(listen(props.channel, props.on, (e) => {
        data.FlowerImage = e.FlowerImage;
        data.FlowerID = e.FlowerID;
        openModal();
    }));
    stops.push(listen(props.channel, props.update, (e) => {
        data.loading = e.loading;
        data.description = e.description;
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
// Whatever closes it, Esc too, leaves it ready for the next flower
const reset = () => {
    data.loading = true;
    data.description = "processing";
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
    p{
        overflow: auto;
        overflow-wrap: break-word;
        font-size: 1.6rem;
    }
    .description-caption{
        overflow: auto;
        overflow-wrap: break-word;
        padding-left: 1rem;
        padding-right: 1rem;
        text-align: center;
    }
    .actions{
        --fe-button-margin: 0 0.31rem 0.6rem 0.31rem;
    }
    @media only screen and (max-width: 1280px){
        p{
            font-size: 0.9rem;
        }
    }
</style>
