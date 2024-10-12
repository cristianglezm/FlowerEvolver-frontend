<template>
  <div v-if="props.flowers && props.flowers.length" class="grid">
    <div v-for="flower in props.flowers" :key="flower.id">
      <FlowerCard :id="flower.id" :genome="flower.genome" :image="flower.image" :isLocal="props.isLocal" />
    </div>
  </div>
  <div v-else class="error">
    <p>{{ props.noFlowerMessage }}</p>
  </div>
</template>

<script setup>

import FlowerCard from './FlowerCard.vue';

const props = defineProps({
    flowers:{
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
        grid-template-columns: repeat(auto-fill, minmax(15%, 1fr));
        grid-gap: 1rem;
        background-color: black;
    }
    @media only screen and (max-width: 1280px){
        .grid{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(30%, 1fr));
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
