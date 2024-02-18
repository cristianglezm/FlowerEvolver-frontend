<template>
    <div class="TitleHeader">
        <div v-if="data.showWarning" id="warning" role="warning">
            <span @click="data.showWarning = false">X</span>
            <p>Remote flowers are deleted daily at 00:00 UTC</p>
        </div>
        <header id="appTitle">
            <a :href="data.base_url" style="text-decoration: none; position: relative; z-index: 1;"><h1>Flower Evolver</h1></a>
            <canvas id="flowerGarden" :width="data.flowerGardenRect.width" :height="data.flowerGardenRect.height"></canvas>
        </header>
    </div>
</template>

<script setup>
/// @todo use garden.worker.js? impl
import { onMounted, reactive } from 'vue';
import { useFlowersStore } from '../store';

let store = useFlowersStore();
const data = reactive({
    showWarning: true,
    base_url: import.meta.env.BASE_URL,
    flowerGardenRect: {width:200, height:200},
});

onMounted(() => {
    data.flowerGardenRect = getRect();
    setTimeout(() => {
        let numFlowers = data.flowerGardenRect.width / 32;
        for(let i=0;i<numFlowers;++i){
            addFlowerToGarden(i);
        }
    }, 200);
});

const getRect = () => {
    const element = document.getElementById('appTitle');
    return element.getBoundingClientRect();
};
const addFlowerToGarden = (i) => {
    let flowerGarden = document.getElementById("flowerGarden");
    let ctx = flowerGarden.getContext("2d");
    const radius = 8;
    let x = i * (radius * 4);
    let y = flowerGarden.height - (radius * 3 + 2);
    try{
        let canvas = document.getElementById("canvas");
        canvas.width = radius*2;
        canvas.height = radius*3;
        store.fe.makeFlower(radius, 2, 6.0, 1.0);
        ctx.drawImage(canvas, x, y);
    }catch(e){
        store.errors.push({message: e});
    }
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