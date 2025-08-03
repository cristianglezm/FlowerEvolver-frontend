<template>
  <div ref="panelRef" :style="panelStyle" class="floating-panel" v-bind="$attrs">
    <slot />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useFloating, offset, flip, shift } from '@floating-ui/vue';
import { autoUpdate } from '@floating-ui/dom';

const props = defineProps({
  reference: {
    type: HTMLElement,
    default: null
  },
  loc: {
    type: String,
    default: "bottom",
    validator: (value) => [
      "top", "top-start", "top-end", 
      "bottom", "bottom-start", "bottom-end", 
      "left", "left-start", "left-end", 
      "right", "right-start", "right-end"].includes(value),
  },
  matchParentWidth: {
    type: Boolean,
    default: false,
  },
  offsetX: {
    type: Number,
    default: 0,
  },
  offsetY: {
    type: Number,
    default: 0,
  },
});

const panelRef = ref(null);
const referenceRef = ref(null);
const panelStyle = ref({});

let cleanupAutoUpdate;

onMounted(async () => {
  await nextTick();
  if(!panelRef.value){
    return;
  }
  if(props.reference === null){
    referenceRef.value = panelRef.value.parentElement;
  }else{
    referenceRef.value = props.reference;
  }
  if(!referenceRef.value){
    console.warn("FloatingPanel: Could not find reference element.");
    return;
  }
  const { x, y, strategy, update } = useFloating(referenceRef, panelRef, {
    placement: props.loc,
    middleware: [
      offset({ mainAxis: props.offsetY, crossAxis: props.offsetX }),
      flip(),
      shift(),
    ],
  });
  cleanupAutoUpdate = autoUpdate(referenceRef.value, panelRef.value, update);
  watch([x, y, strategy], ([xVal, yVal, strat]) => {
    const refRect = referenceRef.value.getBoundingClientRect();
    panelStyle.value = {
      position: strat,
      left: `${xVal}px`,
      top: `${yVal}px`,
      "z-index": 10,
      width: props.matchParentWidth ? `${refRect.width}px` : "auto",
    };
  }, { immediate: true });

  watch(() => [props.loc, props.offsetX, props.offsetY, props.matchParentWidth], () => {
    update();
  }, { flush: "post" });
});
onUnmounted(() => {
  if(cleanupAutoUpdate){
    cleanupAutoUpdate();
  }
});
</script>

<style scoped>
.floating-panel {
  background-color: transparent;
  width: auto;
  height: auto;
  box-sizing: border-box;
}
</style>
