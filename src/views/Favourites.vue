<template>
  <div id="favourites">
    <PaginationOrInfiniteScroll
      :pagination="isPaginated()" :itemsLength="favourites.length" :currentPage="data.page" :totalPages="data.totalPages"
      @next-page="nextPage" @prev-page="prevPage" @update-page="updateFlowers"
    >
      <FlowersTable :flowers="favourites" :isLocal="true" :noFlowerMessage="'You don\'t have favourites.'" />
    </PaginationOrInfiniteScroll>
  </div>
</template>

<script setup>

    import { onMounted, reactive, computed, nextTick } from 'vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
    import { useFlowersStore } from '../store';
    import { useAIStore } from '../store/AIStore';
    import { useRoute, useRouter } from 'vue-router';

    const store = useFlowersStore();
    const AIStore = useAIStore();
    const routes = useRoute();
    const router = useRouter();

    let data = reactive({
        offset: 0,
        page: parseInt(routes.query.page, 10) || 0,
        totalPages: 0
    });
    let favourites = computed(() => {
        return store.favourites;
    });
    onMounted(() => {
        store.favourites = [];
        data.offset = 0;
        if(isPaginated()){
            getFlowersFrom(data.page);
            store.getFavouritesCount().then(c => data.totalPages = Math.round(c / store.settings.limit));
        }else{
            updateFlowers();
        }
    });

    const prevPage = () => {
        if(data.page >= 1){
            data.page -= 1;
            router.push({path:"Favourites", query:{page: data.page}});
        }
    };
    const nextPage = () => {
        if(data.page < data.totalPages){
            data.page += 1;
            router.push({path:"Favourites", query:{page: data.page}});
        }
    };
    const isPaginated = () => {
        return store.settings.pagination;
    };
    const updateFlowers = () => {
        nextTick(() => {
            loadFavourites();
            data.offset = store.increaseOffset(data.offset);
        });
    };
    const getFlowersFrom = (page) => {
        store.favourites = [];
        nextTick(() => {
            data.offset = store.calcOffset(page);
            loadFavourites();
        });
    };
    const loadFavourites = async () => {
        let ids = await store.db.favourites.reverse().offset(data.offset)
                                .limit(store.settings.limit).toArray();
        for(const id of ids){
            let f = await store.db.flowers.get(id);
            store.favourites.push(f);
        }
        AIStore.loadLocalDescriptions(data.offset, store.settings.limit);
    };
    
</script>
<style scoped>
    #favourites{
        background-color: rgb(37, 39, 41);;
    }
</style>
