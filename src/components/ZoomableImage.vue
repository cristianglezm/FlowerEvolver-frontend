<template>
  <div ref="container" class="zoom-in-image" @mousemove="moveLens" @mouseleave="hideLens" @touchstart="moveLens" @touchend="hideLens">
    <img ref="mainImage" :src="src" v-bind="$attrs">
    <div ref="lens" :style="lensStyle" class="zoom-lens" />
  </div>
</template>

<script setup>

/**
 * @brief A Vue 3 component that implements a magnifying glass effect on an image.
 *        The lens magnifies a portion of the image where the cursor or touch event occurs.
 *
 * @props
 * @prop {String} src - The source URL of the image to be magnified. Required.
 * @prop {Number} magnification - The magnification factor for the lens. default to 4.
 * @prop {Object} lensSize - The size of the magnifying lens, with properties:
 *        @prop {Number} lensSize.x - The width of the lens in pixels. defaults to 100.
 *        @prop {Number} lensSize.y - The height of the lens in pixels. defaults to 100.
 *
 * @example
 *   <ZoomableImage
 *     :src="/image.png"
 *     :magnification="2"
 *     :lens-size="{ x: 150, y: 150 }"
 *   />
 */
import { ref, reactive } from "vue";

const props = defineProps({
  src:{
    type: String,
    required: true
  },
  magnification:{
    type: Number,
    required: false,
    default: 4
  },
  lensSize:{
    type: Object,
    required: false,
    default: () => {({x: 100, y: 100})}
  }
});

const container = ref(null);
const mainImage = ref(null);
const lens = ref(null);

const lensStyle = reactive({
  visibility: "hidden",
  position: "absolute",
  border: "2px solid lightgreen",
  borderRadius: "50%",
  width: `${props.lensSize.x}px`,
  height: `${props.lensSize.y}px`,
  backgroundRepeat: "no-repeat",
  pointerEvents: "none",
});

const getEventCoordinates = (event) => {
  if(event.type.includes("touch")){
    const touch = event.touches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: event.clientX, y: event.clientY };
};
const moveLens = (event) => {
  const { x, y } = getEventCoordinates(event);
  const containerRect = container.value.getBoundingClientRect();
  const lensSize = {
    width: lens.value.offsetWidth,
    height: lens.value.offsetHeight,
  };

  let posX = x - containerRect.left;
  let posY = y - containerRect.top;

  if (posX > containerRect.width - lensSize.width / 2) posX = containerRect.width - lensSize.width / 2;
  if (posX < lensSize.width / 2) posX = lensSize.width / 2;
  if (posY > containerRect.height - lensSize.height / 2) posY = containerRect.height - lensSize.height / 2;
  if (posY < lensSize.height / 2) posY = lensSize.height / 2;

  lensStyle.left = `${posX - lensSize.width / 2}px`;
  lensStyle.top = `${posY - lensSize.height / 2}px`;
  lensStyle.visibility = "visible";

  const zoomX = (posX / containerRect.width) * mainImage.value.width;
  const zoomY = (posY / containerRect.height) * mainImage.value.height;

  lensStyle.backgroundImage = `url(${props.src})`;
  lensStyle.backgroundSize = `${mainImage.value.width * props.magnification}px ${mainImage.value.height * props.magnification}px`;
  lensStyle.backgroundPosition = `-${zoomX * props.magnification - lensSize.width / 2}px -${zoomY * props.magnification - lensSize.height / 2}px`;
};

const hideLens = () => {
  lensStyle.visibility = "hidden";
};
</script>

<style scoped>
.zoom-in-image {
  position: relative;
}
.zoom-lens {
  width: 100px;
  height: 100px;
  position: absolute;
  border: 2px solid lightgreen;
  border-radius: 50%;
  background-repeat: no-repeat;
  pointer-events: none;
  transition: opacity 0.6s ease-in-out;
}
</style>
