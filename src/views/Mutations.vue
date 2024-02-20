<template>
    <div class="Mutations">
        <div class="mutFlower">
            <Flower :id="data.original.id" :genome="data.original.genome" :image="data.original.image" :isLocal="data.isLocal"/>
        </div>
        <div class="header"><p><strong>Mutations of {{data.original.id}}</strong></p></div>
        <PaginationOrInfiniteScroll :pagination="isPaginated()" :itemsLength="mutations.length" :currentPage="data.page" :totalPages="data.totalPages"
                                    @next-page="nextPage" @prev-page="prevPage" @update-page="updateMutations">
            <FlowersTable :Flowers="mutations" :isLocal="data.isLocal" :noFlowerMessage="'This Flower Has no Mutations.'"/>
        </PaginationOrInfiniteScroll>
    </div>
</template>

<script setup>

    import { reactive, computed, nextTick, onMounted } from 'vue';
    import Flower from '../components/Flower.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
    import { useRoute, useRouter } from 'vue-router';
    import { useFlowersStore } from '../store';
	
    const store = useFlowersStore();
    const routes = useRoute();
    const router = useRouter();
    const data = reactive({
        offset: 0,
        original: { id: 0, genome: "", image: ""},
        page: parseInt(routes.query.page, 10) || 0,
        totalPages: 0,
        isLocal: routes.params.isLocal === "local"
    });
    onMounted(() => {
        Init();
    });
    let mutations = computed(() => {
        return store.getMutations();
    });

    const Init = async () => {
        let originalID = parseInt(routes.params.id);
        if(data.isLocal){
            data.original = await store.db.flowers.get(originalID); //.then(f => data.original = f);
        }else{
            data.original = { id: originalID, genome: originalID + '.json', image: originalID + '.png'};
        }
        if(isPaginated()){
            if(data.isLocal){
                store.getLocalMutationsCount(data.original.id).then(c => data.totalPages = Math.round(c / store.settings.limit));;
            }else{
                store.getRemoteMutationsCount(data.original.id).then(c => data.totalPages = Math.round(c / store.settings.limit));;
            }
            getMutationsFrom(data.page);
        }else{
            store.mutations = [];
            updateMutations();
        }
    };
    const getMutationsFrom = (page) => {
        nextTick(() => {
            data.offset = store.calcOffset(page);
            if(data.isLocal){
                store.updateLocalMutations({flower: data.original, limit: store.settings.limit, offset: data.offset});
            }else{
                store.updateRemoteMutations({flower: data.original, limit: store.settings.limit, offset: data.offset});
            }
        });
    };
    const updateMutations = () => {
        nextTick(() => {
            if(data.isLocal){
                store.updateAndConcatLocalMutations({flower: data.original, limit: store.settings.limit, offset: data.offset});
            }else{
                store.updateAndConcatRemoteMutations({flower: data.original, limit: store.settings.limit, offset: data.offset});
            }
            data.offset = store.increaseOffset(data.offset);
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
        return store.settings.pagination;
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
        display: grid;
        justify-items: center;
    }
</style>