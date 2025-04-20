<template>
  <div class="Mutations">
    <div v-if="data.original.genome != ''" class="mutFlower">
      <FlowerCard :id="data.original.id" :genome="data.original.genome" :image="data.original.image" :isLocal="data.isLocal" />
    </div>
    <div class="header"><p><strong>Mutations of {{ data.original.id }}</strong></p></div>
    <PaginationOrInfiniteScroll
      :pagination="isPaginated()" :itemsLength="mutations.length" :currentPage="data.page" :totalPages="data.totalPages"
      @next-page="nextPage" @prev-page="prevPage" @update-page="updateMutations"
    >
      <FlowersTable :flowers="mutations" :isLocal="data.isLocal" :noFlowerMessage="'This Flower Has no Mutations.'" />
    </PaginationOrInfiniteScroll>
  </div>
</template>

<script setup>

    import { reactive, computed, nextTick, onBeforeMount } from 'vue';
    import FlowerCard from '../components/FlowerCard.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
    import { useRoute, useRouter } from 'vue-router';
    import { useFlowerStore } from '../stores/FlowerStore';
	
    const FlowerStore = useFlowerStore();
    const routes = useRoute();
    const router = useRouter();
    let data = reactive({
        offset: 0,
        original: { id: 0, genome: "", image: ""},
        page: parseInt(routes.query.page, 10) || 0,
        totalPages: 0,
        isLocal: routes.params.isLocal === "local"
    });
    onBeforeMount(() => {
        Init();
    });
    let mutations = computed(() => {
        return FlowerStore.getMutations;
    });

    const Init = async () => {
        let originalID = parseInt(routes.params.id);
        if(data.isLocal){
            data.original = await FlowerStore.db.flowers.get(originalID);
        }else{
            data.original = { id: originalID, genome: originalID + '.json', image: originalID + '.png'};
        }
        if(isPaginated()){
            if(data.isLocal){
                FlowerStore.getLocalMutationsCount(data.original.id).then(c => data.totalPages = Math.round(c / FlowerStore.settings.limit));
            }else{
                FlowerStore.getRemoteMutationsCount(data.original.id).then(c => data.totalPages = Math.round(c / FlowerStore.settings.limit));
            }
            getMutationsFrom(data.page);
        }else{
            FlowerStore.mutations = [];
            updateMutations();
        }
    };
    const getMutationsFrom = (page) => {
        nextTick(() => {
            data.offset = FlowerStore.calcOffset(page);
            if(data.isLocal){
                FlowerStore.updateLocalMutations({flower: data.original, limit: FlowerStore.settings.limit, offset: data.offset});
            }else{
                FlowerStore.updateRemoteMutations({flower: data.original, limit: FlowerStore.settings.limit, offset: data.offset});
            }
        });
    };
    const updateMutations = () => {
        nextTick(() => {
            if(data.isLocal){
                FlowerStore.updateAndConcatLocalMutations({flower: data.original, limit: FlowerStore.settings.limit, offset: data.offset});
            }else{
                FlowerStore.updateAndConcatRemoteMutations({flower: data.original, limit: FlowerStore.settings.limit, offset: data.offset});
            }
            data.offset = FlowerStore.increaseOffset(data.offset);
        });
    };
    const prevPage = () => {
        if(data.page >= 1){
            data.page -= 1;
            pushRoute();
        }
    };
    const nextPage = () => {
        if(data.page < data.totalPages){
            data.page += 1;
            pushRoute();
        }
    };
    const pushRoute = () => {
        let localOr = data.isLocal ? "local":"remote";
        router.push({name:"Mutations", params: {id: data.original.id, isLocal: localOr}, query:{page: data.page}});
    };
    const isPaginated = () => {
        return FlowerStore.settings.pagination;
    };

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
