<template>
  <div class="pIcon" @click="toogle()">
    p
  </div>
  <div v-if="showing">
    <FloatingPanel :loc="'bottom'" :match-parent-width="false">
      <div class="ParamsInfo">
        <div style="display: flex; flex-flow: row nowrap;">
          <h2>Parameters</h2>
          <span class="close" @click="close()">&times;</span>
        </div>
        <p>Radius: {{ props.params.radius }}</p>
        <p>Number of layers: {{ props.params.numLayers }}</p>
        <p>P: {{ props.params.P.toFixed(2) }}</p>
        <p>Bias: {{ props.params.bias.toFixed(2) }}</p>
      </div>
    </FloatingPanel>
  </div>
</template>

<script setup>
    import { ref } from 'vue';
    import FloatingPanel from './FloatingPanel.vue';

    const props = defineProps({
        params: {
            type: Object,
            required: true,
            validator: (value) => {
                return 'radius' in value && 'numLayers' in value &&
                       'P' in value && 'bias' in value;
            }
        }
    });
    let showing = ref(false);
    const toogle = () => {
        showing.value = !showing.value;
    };
    const close = () => {
        showing.value = false;
    };
</script>

<style scoped>
    .close{
        color: lightgreen;
        margin-right: 1%;
        font-size: 1.8rem;
        font-weight: bold;
        cursor: pointer;
        position: relative;
    }
    .pIcon{
        background-color: green;
        border: solid lightgreen;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        width: 1.75rem;
        height: 1.75rem;
        cursor: pointer;
        color: lightgreen;
        font-weight: bold;
        user-select: none;
    }
    .ParamsInfo{
        color: lightgreen;
        background-color: green;
        border: solid lightgreen;
        border-radius: 1.25rem;
        padding: 0.6rem;
        overflow: auto;
        overflow-wrap: break-word;
    }
</style>
