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
    import { useFlowerStore } from '../stores/FlowerStore';
    import { useCaptionerStore } from '../stores/CaptionerStore';
    import { useRoute, useRouter } from 'vue-router';

    const FlowerStore = useFlowerStore();
    const CaptionerStore = useCaptionerStore();
    const routes = useRoute();
    const router = useRouter();

    let data = reactive({
        offset: 0,
        page: parseInt(routes.query.page, 10) || 0,
        totalPages: 0
    });
    let favourites = computed(() => {
        return FlowerStore.favourites;
    });
    onMounted(() => {
        FlowerStore.favourites = [];
        data.offset = 0;
        if(isPaginated()){
            getFlowersFrom(data.page);
            FlowerStore.getFavouritesCount().then(c => data.totalPages = Math.round(c / FlowerStore.settings.limit));
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
        return FlowerStore.settings.pagination;
    };
    const updateFlowers = () => {
        nextTick(() => {
            loadFavourites();
            data.offset = FlowerStore.increaseOffset(data.offset);
        });
    };
    const getFlowersFrom = (page) => {
        FlowerStore.favourites = [];
        nextTick(() => {
            data.offset = FlowerStore.calcOffset(page);
            loadFavourites();
        });
    };
    const loadFavourites = async () => {
        let ids = await FlowerStore.db.favourites.reverse().offset(data.offset)
                                .limit(FlowerStore.settings.limit).toArray();
        for(const id of ids){
            let f = await FlowerStore.db.flowers.get(id);
            FlowerStore.favourites.push(f);
        }
        CaptionerStore.loadLocalDescriptions(data.offset, FlowerStore.settings.limit);
    };
    
</script>
<style scoped>
    #favourites{
        background-color: rgb(37, 39, 41);;
    }
</style>
