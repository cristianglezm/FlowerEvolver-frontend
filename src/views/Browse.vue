<template>
  <div class="Browse">
    <PaginationOrInfiniteScroll
      :pagination="isPaginated()" :itemsLength="flowers.length" :currentPage="data.page" :totalPages="data.totalPages"
      @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch"
    >
      <FlowersTable :flowers="flowers" :isLocal="false" :noFlowerMessage="'There are no Flowers'" />
    </PaginationOrInfiniteScroll>
  </div>
</template>

<script setup>

    import { reactive, computed, nextTick, onMounted } from 'vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
    import { useRoute, useRouter } from 'vue-router';
    import { useFlowersStore } from '../store';

    const store = useFlowersStore();
    const routes = useRoute();
    const router = useRouter();
    let data = reactive({
        offset: 0,
        page: parseInt(routes.query.page, 10) || 0,
        totalPages: 0
    });
    onMounted(() => {
        data.offset = 0;
        if(isPaginated()){
            getFlowersFrom(data.page);
            store.getRemoteFlowersCount().then(c => data.totalPages = Math.round(c / store.settings.limit));
        }else{
            store.updateRemoteFlowers({limit: store.settings.limit, offset: data.offset});
            data.offset = store.increaseOffset(data.offset);
        }
    });
    let flowers = computed(() => {
        return store.getRemoteFlowers();
    });
    const nextBatch = () => {
        updateFlowers(store.settings.limit, data.offset);
    };
    const updateFlowers = (limit, offset) => {
        nextTick(() => {
            store.updateAndConcatRemoteFlowers({limit: limit, offset: offset});
            data.offset = store.increaseOffset(offset);
        });
    };
    const getFlowersFrom = (page) => {
        nextTick(() => {
            data.offset = store.calcOffset(page);
            store.updateRemoteFlowers({limit: store.settings.limit, offset: data.offset});
        });
    };
    const prevPage = () => {
        if(data.page >= 1){
            data.page -= 1;
            router.push({path:"Browse", query:{page: data.page}});
        }
    };
    const nextPage = () => {
        if(data.page < data.totalPages){
            data.page += 1;
            router.push({path:"Browse", query:{page: data.page}});
        }
    };
    const isPaginated = () => {
        return store.settings.pagination;
    };
</script>

<style scoped>
    .Browse{
        background-color: rgb(37, 39, 41);
    }
</style>
