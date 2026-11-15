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
import { useShownFlowers } from '../composables/useShownFlowers';
import * as flowerRepository from '../services/flowerRepository';
import { usePaginatedList } from '../composables/usePaginatedList';
import { usePageInAddress } from '../composables/usePageInAddress';
import { useRoute } from 'vue-router';

const routes = useRoute();
const whenShown = useShownFlowers();

const paged = usePaginatedList({
    list: 'favourites',
    fetchCount: () => flowerRepository.countFavourites(),
    fetchPage: ({ limit, offset }) => flowerRepository.listFavourites({ limit, offset }),
    // the species and the descriptions of the flowers that are shown
    onLoaded: ({ items }) => whenShown(items)
});
const { state, isPaginated, init, nextBatch } = paged;
const { nextPage, prevPage } = usePageInAddress(paged);

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
