<template>
  <div class="tipInfo" @click="toogle()">
    p
  </div>
  <div v-if="showing" class="ParamsInfo">
    <div style="display: flex; flex-flow: row nowrap;">
      <h2>Parameters</h2>
      <span class="close" @click="close()">&times;</span>
    </div>
    <p>Radius: {{ props.params.radius }}</p>
    <p>Number of layers: {{ props.params.numLayers }}</p>
    <p>P: {{ props.params.P.toFixed(2) }}</p>
    <p>Bias: {{ props.params.bias.toFixed(2) }}</p>
  </div>
</template>

<script setup>
    import { ref } from 'vue';
    const props = defineProps({
        params: {
            type: Object,
            required: true
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
        float: right;
        font-size: 1.8rem;
        font-weight: bold;
        cursor: pointer;
        right: -10%;
        position: relative;
    }
    .tipInfo{
        background-color: green;
        border: solid lightgreen;
        border-radius: 1.25rem;
        display: inline-grid;
        text-align: center;
        padding-left: 0.3rem;
        padding-right: 0.3rem;
        cursor: pointer;
        color:lightgreen;
    }
    .ParamsInfo{
        color: lightgreen;
        background-color: green;
        border: solid lightgreen;
        border-radius: 1.25rem;
        position: absolute;
        padding: 0.6rem;
        overflow: auto;
        overflow-wrap: break-word;
        z-index: 1;
    }
</style>
