<template>
  <div class="Mutations">
    <div v-if="data.original.genome != ''" class="mutFlower">
      <FlowerCard :id="data.original.id" :genome="data.original.genome" :image="data.original.image" :isLocal="data.isLocal" />
    </div>
    <div class="header"><p><strong>Mutations of {{ data.original.id }}</strong></p></div>
    <PaginationOrInfiniteScroll
      :pagination="isPaginated" :items-length="state.items.length"
      :current-page="state.page" :total-pages="state.totalPages"
      @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch"
    >
      <FlowersTable :flowers="state.items" :is-local="data.isLocal" :no-flower-message="'This Flower Has no Mutations.'" />
    </PaginationOrInfiniteScroll>
  </div>
</template>

<script setup>

import { reactive, onMounted } from 'vue';
import FlowerCard from '../components/FlowerCard.vue';
import FlowersTable from '../components/FlowersTable.vue';
import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
import { useRoute } from 'vue-router';
import { useFlowerStore } from '../stores/FlowerStore';
import { useErrorStore } from '../stores/ErrorStore';
import * as flowerRepository from '../services/flowerRepository';
import * as flowerApiClient from '../services/flowerApiClient';
import { usePaginatedList } from '../composables/usePaginatedList';

const FlowerStore = useFlowerStore();
const ErrorStore = useErrorStore();
const routes = useRoute();
const originalID = parseInt(routes.params.id);
const isLocal = routes.params.isLocal === 'local';
const data = reactive({
    original: { id: originalID, genome: '', image: '' },
    isLocal
});

// the mutations of the flower in the local rows: each one is a flower of its own
const readLocal = async ({ limit, offset }) => {
    const rows = await flowerRepository.listMutationsByOriginal({ original: originalID, limit, offset });
    const flowers = await Promise.all(rows.map((m) => flowerRepository.getFlower(m.id)));
    // a mutation whose flower was deleted has nothing to show
    return flowers.filter((f) => f !== undefined);
};

const { state, isPaginated, init, nextPage, prevPage, nextBatch } = usePaginatedList({
    // the mutations of the browser and those of the server are not the same list
    list: isLocal ? 'localMutations' : 'remoteMutations',
    // A mutation is stored as a mutation of the flower that was mutated, which can be one of the mutations in this
    // list: that one is in the list of that flower, and not in this one after the page is read again.
    accepts: (_, relation) => relation?.original === originalID,
    fetchCount: () => {
        return isLocal ? flowerRepository.countMutations(originalID)
                       // reports a server that cannot be reached, the pages do not
                       : FlowerStore.getRemoteMutationsCount(originalID);
    },
    fetchPage: ({ limit, offset }) => {
        return isLocal ? readLocal({ limit, offset })
                       : flowerApiClient.getMutations(originalID, { limit, offset }).catch(() => []);
    }
});

onMounted(async () => {
    // ?page= is the page to start at, the pages after it are not a route each
    init(parseInt(routes.query.page, 10) || 0);
    if(!isLocal){
        data.original = { id: originalID, genome: originalID + '.json', image: originalID + '.png' };
        return;
    }
    try{
        // a flower that is not there is not drawn, its mutations are still listed
        data.original = await flowerRepository.getFlower(originalID) ?? data.original;
    }catch(e){
        ErrorStore.push(e);
    }
});

</script>

<style scoped>
    .Mutations{
        background-color: black;
    }
    .header{
        text-align: center;
        color: lightgreen;
        background-color: green;
    }
    .mutFlower{
        position: relative;
        display: flex;
        justify-content: center;
        margin: 0 auto;
        width: 15%;
    }
</style>
