<template>
  <div id="favourites">
    <PaginationOrInfiniteScroll
      :pagination="isPaginated" :items-length="state.items.length"
      :current-page="state.page" :total-pages="state.totalPages"
      @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch"
    >
      <FlowersTable :flowers="state.items" :is-local="true" :no-flower-message="'You don\'t have favourites.'" />
    </PaginationOrInfiniteScroll>
  </div>
</template>

<script setup>

import { onMounted } from 'vue';
import FlowersTable from '../components/FlowersTable.vue';
import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
import { useCaptionerStore } from '../stores/CaptionerStore';
import * as flowerRepository from '../services/flowerRepository';
import { usePaginatedList } from '../composables/usePaginatedList';
import { useRoute } from 'vue-router';

const routes = useRoute();
const CaptionerStore = useCaptionerStore();

const { state, isPaginated, init, nextPage, prevPage, nextBatch } = usePaginatedList({
    list: 'favourites',
    fetchCount: () => flowerRepository.countFavourites(),
    fetchPage: ({ limit, offset }) => flowerRepository.listFavourites({ limit, offset }),
    // the descriptions are paged like the flowers: a page replaces those of the page before, a batch adds to them
    onLoaded: ({ offset, limit, append }) => {
        return append ? CaptionerStore.loadAndConcatLocalDescriptions(offset, limit)
                      : CaptionerStore.loadLocalDescriptions(offset, limit);
    }
});

onMounted(() => {
    // ?page= is the page to start at, the pages after it are not a route each
    init(parseInt(routes.query.page, 10) || 0);
});

</script>

<style scoped>
    #favourites{
        background-color: rgb(37, 39, 41);;
    }
</style>
