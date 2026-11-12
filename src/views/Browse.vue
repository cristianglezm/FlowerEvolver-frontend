<template>
  <div class="Browse">
    <PaginationOrInfiniteScroll
      :pagination="isPaginated" :items-length="state.items.length"
      :current-page="state.page" :total-pages="state.totalPages"
      @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch"
    >
      <FlowersTable :flowers="state.items" :is-local="false" :no-flower-message="'There are no Flowers'" />
    </PaginationOrInfiniteScroll>
  </div>
</template>

<script setup>

import { onMounted } from 'vue';
import FlowersTable from '../components/FlowersTable.vue';
import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
import { useFlowerStore } from '../stores/FlowerStore';
import * as flowerApiClient from '../services/flowerApiClient';
import { usePaginatedList } from '../composables/usePaginatedList';
import { useRoute } from 'vue-router';

const routes = useRoute();
const FlowerStore = useFlowerStore();

const { state, isPaginated, init, nextPage, prevPage, nextBatch } = usePaginatedList({
    list: 'remote',
    // the count says when the server cannot be reached, and the pages do not: a server that is offline is not
    // an error to show on every page, the list is empty
    fetchCount: () => FlowerStore.getRemoteFlowersCount(),
    fetchPage: ({ limit, offset }) => flowerApiClient.getFlowers({ limit, offset }).catch(() => [])
});

onMounted(() => {
    // ?page= is the page to start at, the pages after it are not a route each
    init(parseInt(routes.query.page, 10) || 0);
});

</script>

<style scoped>
    .Browse{
        background-color: rgb(37, 39, 41);
    }
</style>
