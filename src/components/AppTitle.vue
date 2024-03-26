<template>
  <div class="TitleHeader">
    <div v-if="data.showWarning" id="warning" role="warning">
      <span @click="closeWarning()">X</span>
      <p>Remote flowers are deleted daily at 00:00 UTC</p>
      <p>The website only uses essential cookies to store flowers and preferences.</p>
    </div>
    <header id="appTitle">
      <a :href="data.base_url" style="text-decoration: none; position: relative; z-index: 1;"><h1>Flower Evolver</h1></a>
      <canvas id="flowerGarden" :width="data.flowerGardenRect.width" :height="data.flowerGardenRect.height" />
    </header>
  </div>
</template>

<script setup>

import { onMounted, reactive } from 'vue';
import { STORAGE_KEY_GARDEN, useFlowersStore } from '../store';
import gardenWorker from '../workers/garden.worker?worker';

const gardenRadius = 8;
const STORAGE_KEY_WARNING = "FlowerEvolverShowWarning";

let worker = gardenWorker();
let store = useFlowersStore();

const data = reactive({
    showWarning: JSON.parse(localStorage.getItem(STORAGE_KEY_WARNING) || "true"),
    base_url: import.meta.env.BASE_URL,
    flowerGardenRect: {width:200, height:200},
});

worker.onmessage = (e) =>{
    let position = {
        x: Math.floor(e.data.id * (gardenRadius * 4)),
        y: data.flowerGardenRect.height - (gardenRadius * 3 + 4)
    };
    let ready = e.data.ready;
    if(ready){
        // this will be used in settings to export the garden.
        sessionStorage.setItem(STORAGE_KEY_GARDEN, e.data.garden);
        worker.terminate();
    }else{
        let flowerGarden = document.getElementById("flowerGarden");
        let ctx = flowerGarden.getContext("2d");
        ctx.drawImage(e.data.image, position.x, position.y);
    }
};
worker.onerror = (e) => {
    store.errors.push({message: e});
};

onMounted(() => {
    data.flowerGardenRect = getRect();
    let numFlowers = data.flowerGardenRect.width / (gardenRadius * 4);
    worker.postMessage({
        numFlowers: numFlowers,
        radius: gardenRadius
    });
});

const closeWarning = () => {
    data.showWarning = false;
    localStorage.setItem(STORAGE_KEY_WARNING, data.showWarning)
};

const getRect = () => {
    const element = document.getElementById('appTitle');
    return element.getBoundingClientRect();
};

</script>

<style scoped>
    h1{
        font-size: 7.5rem;
        padding: 0rem;
        margin: 0rem;
        color: lightgreen;
    }
    @media only screen and (max-width: 1280px){
        h1{
            font-size: 2.25rem;
            padding: 0rem;
            margin: 0rem;
            color: lightgreen;
        }
    }
    #flowerGarden{
        position: absolute;
        top: 0.6rem;
        z-index: 0;
    }
    .TitleHeader{
        background-color: green;
        position: relative;
    }
    @media only screen and (max-width: 1280px){
        #appTitle{
            padding: 0rem 0rem 0.6rem 0rem;
        }
    }
    #warning span{
        position: relative;
        margin-right: 0.31rem;
        font-size: 1.75rem;
        font-weight: bold;
        cursor: pointer;
        float: right;
    }
    #warning{
        font-size: 1.25rem;
        color: lightgreen;
        position: absolute;
        z-index: 2;
        width: 100%;
        text-align: center;
        border-radius: 0.25rem;
        border: solid lightgreen;
        background-color: green;
    }
</style>
