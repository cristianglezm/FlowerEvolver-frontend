<template>
  <div class="Ancestors">
    <div v-if="!hasFatherOnly()">
      <div v-if="data.flower1.genome != '' && data.flower2.genome != ''" class="gridFlowers">
        <div><FlowerCard :id="data.flower1.id" :genome="data.flower1.genome" :image="data.flower1.image" :isLocal="data.isLocal" /></div>
        <div><FlowerCard :id="data.flower2.id" :genome="data.flower2.genome" :image="data.flower2.image" :isLocal="data.isLocal" /></div>
      </div>
      <div class="header"><p><strong>Descendants of {{ data.flower1.id }} and {{ data.flower2.id }}</strong></p></div>
      <PaginationOrInfiniteScroll
        :pagination="isPaginated()" :itemsLength="ancestors.length" :currentPage="data.page" :totalPages="data.totalPages"
        @next-page="nextPage" @prev-page="prevPage" @update-page="updateAncestors"
      >
        <FlowersTable :flowers="ancestors" :isLocal="data.isLocal" :noFlowerMessage="'These Flowers have no descendants.'" />
      </PaginationOrInfiniteScroll>
    </div>
    <div v-else>
      <div v-if="data.flower1.genome != ''" class="fatherFlower">
        <FlowerCard :id="data.flower1.id" :genome="data.flower1.genome" :image="data.flower1.image" :isLocal="data.isLocal" />
      </div>
      <div class="header"><p><strong>Descendants of {{ data.flower1.id }}</strong></p></div>
      <PaginationOrInfiniteScroll
        :pagination="isPaginated()" :itemsLength="ancestors.length" :currentPage="data.page" :totalPages="data.totalPages"
        @next-page="nextPage" @prev-page="prevPage" @update-page="updateAncestors"
      >
        <FlowersTable :flowers="ancestors" :isLocal="data.isLocal" :noFlowerMessage="'This Flower has no descendants.'" />
      </PaginationOrInfiniteScroll>
    </div>
  </div>
</template>

<script setup>

    import { reactive, computed, nextTick, onBeforeMount } from 'vue';
    import FlowerCard from '../components/FlowerCard.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
    import { useFlowerStore } from '../stores/FlowerStore';
    import { useRoute, useRouter } from 'vue-router';

    const FlowerStore = useFlowerStore();
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
    onBeforeMount(() => {
        Init();
    });
    const ancestors = computed(() => {
        return FlowerStore.getAncestors;
    });
    const hasFatherOnly = () => {
        return routes.params.mother === undefined;
    };
    const Init = async () => {
        if(data.isLocal){
            let dadID = parseInt(routes.params.father);
            await FlowerStore.db.flowers.get(dadID).then((f) => data.flower1 = f);
            if(!hasFatherOnly()){
                let momID = parseInt(routes.params.mother);
                await FlowerStore.db.flowers.get(momID).then((f) => data.flower2 = f);
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
                    FlowerStore.getLocalAncestorsCount(data.flower1.id)
                        .then(c => data.totalPages = Math.round(c / FlowerStore.settings.limit));
                }else{
                    FlowerStore.getLocalAncestorsCount(data.flower1.id, data.flower2.id)
                        .then(c => data.totalPages = Math.round(c / FlowerStore.settings.limit));
                }
            }else{
                if(hasFatherOnly()){
                    FlowerStore.getRemoteAncestorsCount(data.flower1.id)
                        .then(c => data.totalPages = Math.round(c /  FlowerStore.settings.limit));
                }else{
                    FlowerStore.getRemoteAncestorsCount(data.flower1.id, data.flower2.id)
                        .then(c => data.totalPages = Math.round(c / FlowerStore.settings.limit));
                }
            }
            getAncestorsFrom(data.page);
        }else{
            FlowerStore.ancestors = [];
            updateAncestors();
        }
    };
    const getAncestorsFrom = (page) => {
        nextTick(() => {
            data.offset = FlowerStore.calcOffset(page);
            if(data.isLocal){
                if(hasFatherOnly()){
                    FlowerStore.updateLocalAncestors({flower1: data.flower1, flower2: null, limit: FlowerStore.settings.limit, offset: data.offset});
                }else{
                    FlowerStore.updateLocalAncestors({flower1: data.flower1, flower2: data.flower2, limit: FlowerStore.settings.limit, offset: data.offset});
                }
            }else{
                if(hasFatherOnly()){
                    FlowerStore.updateRemoteAncestors({flower1: data.flower1, flower2: null, limit: FlowerStore.settings.limit, offset: data.offset});
                }else{
                    FlowerStore.updateRemoteAncestors({flower1: data.flower1, flower2: data.flower2, limit: FlowerStore.settings.limit, offset: data.offset});
                }
            }
        });
    };
    const updateAncestors = () => {
        nextTick(() => {
            if(data.isLocal){
                if(hasFatherOnly()){
                    FlowerStore.updateAndConcatLocalAncestors({flower1: data.flower1, flower2: null, limit: FlowerStore.settings.limit, offset: data.offset});
                }else{
                    FlowerStore.updateAndConcatLocalAncestors({flower1: data.flower1, flower2: data.flower2,limit: FlowerStore.settings.limit, offset: data.offset});
                }
            }else{
                if(hasFatherOnly()){
                    FlowerStore.updateAndConcatRemoteAncestors({flower1: data.flower1, flower2: null, limit: FlowerStore.settings.limit, offset: data.offset});
                }else{
                    FlowerStore.updateAndConcatRemoteAncestors({flower1: data.flower1, flower2: data.flower2, limit: FlowerStore.settings.limit, offset: data.offset});
                }
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
        if(hasFatherOnly()){
            router.push({name:"DescendantsFatherOrMother", params: {father: data.flower1.id, isLocal: localOr}, query:{page: data.page}});
        }else{
            router.push({name:"DescendantsFatherAndMother", params: {father: data.flower1.id, mother: data.flower2.id, isLocal: localOr}, query:{page: data.page}});
        }
    };
    const isPaginated = () => {
        return FlowerStore.settings.pagination;
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
    @media only screen and (max-width: 1280px){
        .gridFlowers{
            grid-template-columns: 35% 35%;
        }
    }
</style>
