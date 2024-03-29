<template>
  <div class="Ancestors">
    <div v-if="!hasFatherOnly()">
      <div class="gridFlowers">
        <div><Flower :id="data.flower1.id" :genome="data.flower1.genome" :image="data.flower1.image" :isLocal="data.isLocal" /></div>
        <div><Flower :id="data.flower2.id" :genome="data.flower2.genome" :image="data.flower2.image" :isLocal="data.isLocal" /></div>
      </div>
      <div class="header"><p><strong>Descendants of {{ data.flower1.id }} and {{ data.flower2.id }}</strong></p></div>
      <PaginationOrInfiniteScroll
        :pagination="isPaginated()" :itemsLength="ancestors.length" :currentPage="data.page" :totalPages="data.totalPages"
        @next-page="nextPage" @prev-page="prevPage" @update-page="updateAncestors"
      >
        <FlowersTable :Flowers="ancestors" :isLocal="data.isLocal" :noFlowerMessage="'These Flowers have no descendants.'" />
      </PaginationOrInfiniteScroll>
    </div>
    <div v-else>
      <div class="fatherFlower">
        <Flower :id="data.flower1.id" :genome="data.flower1.genome" :image="data.flower1.image" :isLocal="data.isLocal" />
      </div>
      <div class="header"><p><strong>Descendants of {{ data.flower1.id }}</strong></p></div>
      <PaginationOrInfiniteScroll
        :pagination="isPaginated()" :itemsLength="ancestors.length" :currentPage="data.page" :totalPages="data.totalPages"
        @next-page="nextPage" @prev-page="prevPage" @update-page="updateAncestors"
      >
        <FlowersTable :Flowers="ancestors" :isLocal="data.isLocal" :noFlowerMessage="'This Flower has no descendants.'" />
      </PaginationOrInfiniteScroll>
    </div>
  </div>
</template>

<script setup>

    import { onMounted, reactive, computed, nextTick } from 'vue';
    import Flower from '../components/Flower.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
    import { useFlowersStore } from '../store';
    import { useRoute, useRouter } from 'vue-router';

    const store = useFlowersStore();
    const routes = useRoute();
    const router = useRouter();
    let data = reactive({
        offset: 0,
        isLocal: routes.params.isLocal === "local",
        page: parseInt(routes.query.page, 10) || 0,
        totalPages: 0,
        flower1: { id: 0, genome: "", image: ""},
        flower2: { id: 0, genome: "", image: ""}
    });
    onMounted(() => {
        Init();
    });
    const ancestors = computed(() => {
        return store.getAncestors();
    });
    const hasFatherOnly = () => {
        return routes.params.mother === undefined;
    };
    const Init = async () => {
        if(data.isLocal){
            let dadID = parseInt(routes.params.father);
            await store.db.flowers.get(dadID).then((f) => data.flower1 = f);
            if(!hasFatherOnly()){
                let momID = parseInt(routes.params.mother);
                await store.db.flowers.get(momID).then((f) => data.flower2 = f);
            }
        }else{
            let dadID = parseInt(routes.params.father);
            data.flower1 = { id: dadID, genome: dadID + '.json', image: dadID + '.png'};
            if(!hasFatherOnly()){
                let momID = parseInt( routes.params.mother);
                data.flower2 = { id: momID, genome: momID + '.json', image: momID + '.png'};
            }
        }
        if(isPaginated()){
            if(data.isLocal){
                if(hasFatherOnly()){
                    store.getLocalAncestorsCount(data.flower1.id)
                        .then(c => data.totalPages = Math.round(c / store.settings.limit));
                }else{
                    store.getLocalAncestorsCount(data.flower1.id, data.flower2.id)
                        .then(c => data.totalPages = Math.round(c / store.settings.limit));
                }
            }else{
                if(hasFatherOnly()){
                    store.getRemoteAncestorsCount(data.flower1.id)
                        .then(c => data.totalPages = Math.round(c /  store.settings.limit));
                }else{
                    store.getRemoteAncestorsCount(data.flower1.id, data.flower2.id)
                        .then(c => data.totalPages = Math.round(c / store.settings.limit));
                }
            }
            getAncestorsFrom(data.page);
        }else{
            store.ancestors = [];
            updateAncestors();
        }
    };
    const getAncestorsFrom = (page) => {
        nextTick(() => {
            data.offset = store.calcOffset(page);
            if(data.isLocal){
                if(hasFatherOnly()){
                    store.updateLocalAncestors({flower1: data.flower1, flower2: null, limit: store.settings.limit, offset: data.offset});
                }else{
                    store.updateLocalAncestors({flower1: data.flower1, flower2: data.flower2, limit: store.settings.limit, offset: data.offset});
                }
            }else{
                if(hasFatherOnly()){
                    store.updateRemoteAncestors({flower1: data.flower1, flower2: null, limit: store.settings.limit, offset: data.offset});
                }else{
                    store.updateRemoteAncestors({flower1: data.flower1, flower2: data.flower2, limit: store.settings.limit, offset: data.offset});
                }
            }
        });
    };
    const updateAncestors = () => {
        nextTick(() => {
            if(data.isLocal){
                if(hasFatherOnly()){
                    store.updateAndConcatLocalAncestors({flower1: data.flower1, flower2: null, limit: store.settings.limit, offset: data.offset});
                }else{
                    store.updateAndConcatLocalAncestors({flower1: data.flower1, flower2: data.flower2,limit: store.settings.limit, offset: data.offset});
                }
            }else{
                if(hasFatherOnly()){
                    store.updateAndConcatRemoteAncestors({flower1: data.flower1, flower2: null, limit: store.settings.limit, offset: data.offset});
                }else{
                    store.updateAndConcatRemoteAncestors({flower1: data.flower1, flower2: data.flower2, limit: store.settings.limit, offset: data.offset});
                }
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
        if(hasFatherOnly()){
            router.push({name:"DescendantsFatherOrMother", params: {father: data.flower1.id, isLocal: localOr}, query:{page: data.page}});
        }else{
            router.push({name:"DescendantsFatherAndMother", params: {father: data.flower1.id, mother: data.flower2.id, isLocal: localOr}, query:{page: data.page}});
        }
    };
    const isPaginated = () => {
        return store.settings.pagination;
    };

</script>

<style scoped>
    .Ancestors{
        background-color: black;
    }
    .header{
        text-align: center;
        color: lightgreen;
        background-color: green;
    }
    .fatherFlower{
        position: relative;
        display: flex;
        justify-content: center;
        margin: 0 auto;
        width: 15%;
    }
    .gridFlowers{
        display: grid;
        grid-template-columns: 15% 15%;
        grid-gap: 0.6rem;
        justify-content: center;
    }
</style>
