<template>
    <div class="grid" v-if="props.Flowers && props.Flowers.length">
        <div v-for="flower in props.Flowers"  :key="flower.id">
            <Flower :id="flower.id" :genome="flower.genome" :image="flower.image" :isLocal="props.isLocal"/>
        </div>
    </div>
    <div class="error" v-else>
        <p>{{ props.noFlowerMessage }}</p>
    </div>
</template>

<script setup>

import Flower from './Flower.vue';

const props = defineProps({
    Flowers:{
        type: Array,
        required: true
    },
    isLocal: {
        type: Boolean,
        required: true
    },
    noFlowerMessage: {
        type: String,
        required: true
    }
});
</script>

<style scoped>
    .grid{
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(14.3rem, 1fr));
        grid-gap: 1rem;
        background-color: black;
    }
    @media only screen and (max-width: 1280px){
        .grid{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr));
            grid-gap: 1rem;
            background-color: black;
        }
    }
    .error{
        color: lightgreen;
        font-size: 1.2rem;
        text-align: center;
        padding-bottom: 0.8rem;
        padding-top: 0.8rem;
    }
</style>
