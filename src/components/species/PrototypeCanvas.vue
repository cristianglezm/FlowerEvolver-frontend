<template>
  <canvas
    ref="canvas" class="PrototypeCanvas" role="img" :aria-label="props.label"
    :width="props.size" :height="props.size" :style="{ width: props.display + 'px', height: props.display + 'px' }"
  />
</template>

<script setup>
/**
 * The silhouette of the prototype of a species: the flower it is closest to, drawn from the
 * alpha values of the classifier (0 is empty, 1 is petal), one per pixel, row by row.
 *
 * @param {Array<number>} alpha - size * size values in [0, 1].
 * @param {number} size - Pixels on each side of the silhouette.
 * @param {number} display - Pixels on each side on the page, the pixels of the silhouette are not smoothed.
 * @param {string} label - What a screen reader says.
 */
import { onMounted, ref, watch } from 'vue';

const props = defineProps({
    alpha: {
        type: Array,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    display: {
        type: Number,
        default: 48
    },
    label: {
        type: String,
        default: ''
    }
});
const canvas = ref(null);

const draw = () => {
    const context = canvas.value?.getContext('2d');
    if(!context){
        return;
    }
    const image = context.createImageData(props.size, props.size);
    props.alpha.forEach((alpha, i) => {
        // lightgreen, like the rest of the page
        image.data[i * 4] = 144;
        image.data[i * 4 + 1] = 238;
        image.data[i * 4 + 2] = 144;
        // the data of an image keeps a value between 0 and 255, so an alpha out of range is a full or an empty pixel
        image.data[i * 4 + 3] = Math.round(alpha * 255);
    });
    context.putImageData(image, 0, 0);
};
onMounted(draw);
watch(() => [props.alpha, props.size], draw);
</script>

<style scoped>
    .PrototypeCanvas{
        image-rendering: pixelated;
        background-color: rgb(37, 39, 41);
    }
</style>
