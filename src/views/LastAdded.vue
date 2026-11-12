<template>
  <div class="LastAdded">
    <FlowersTable :flowers="flowers" :is-local="false" :no-flower-message="'There are no Flowers'" />
  </div>
</template>

<script setup>

import { ref, onMounted, onUnmounted } from 'vue';
import FlowersTable from '../components/FlowersTable.vue';
import * as flowerApiClient from '../services/flowerApiClient';
import { listenToList } from '../services/listEvents';

const LIMIT = 30;
const REFRESH_EVERY = 30000;

const flowers = ref([]);
let timer = 0;

const refresh = async () => {
    try{
        flowers.value = await flowerApiClient.getFlowers({ limit: LIMIT, offset: 0 });
    }catch(_){
        // a server that is offline is not an error to show every 30 seconds: the list stays as it was
    }
};

// what is made from this browser is shown without waiting for the next refresh, once: the refresh can have it
const stopListening = listenToList('lastAdded', {
    added: (flower) => {
        if(!flowers.value.some((f) => f.id === flower.id)){
            flowers.value = [flower, ...flowers.value];
        }
    }
});

onMounted(() => {
    refresh();
    timer = window.setInterval(refresh, REFRESH_EVERY);
});
onUnmounted(() => {
    window.clearInterval(timer);
    stopListening();
});

</script>

<style scoped>
    .LastAdded{
        background-color: rgb(37, 39, 41);
    }
</style>
