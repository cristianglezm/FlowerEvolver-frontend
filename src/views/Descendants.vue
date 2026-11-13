<template>
  <div class="Descendants">
    <div v-if="!hasFatherOnly">
      <div v-if="data.flower1.genome != '' && data.flower2.genome != ''" class="gridFlowers">
        <div><FlowerCard :id="data.flower1.id" :genome="data.flower1.genome" :image="data.flower1.image" :isLocal="data.isLocal" /></div>
        <div><FlowerCard :id="data.flower2.id" :genome="data.flower2.genome" :image="data.flower2.image" :isLocal="data.isLocal" /></div>
      </div>
      <div class="header"><p><strong>Descendants of {{ data.flower1.id }} and {{ data.flower2.id }}</strong></p></div>
      <PaginationOrInfiniteScroll
        :pagination="isPaginated" :items-length="state.items.length"
        :current-page="state.page" :total-pages="state.totalPages"
        @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch"
      >
        <FlowersTable :flowers="state.items" :is-local="data.isLocal" :no-flower-message="'These Flowers have no descendants.'" />
      </PaginationOrInfiniteScroll>
    </div>
    <div v-else>
      <div v-if="data.flower1.genome != ''" class="fatherFlower">
        <FlowerCard :id="data.flower1.id" :genome="data.flower1.genome" :image="data.flower1.image" :isLocal="data.isLocal" />
      </div>
      <div class="header"><p><strong>Descendants of {{ data.flower1.id }}</strong></p></div>
      <PaginationOrInfiniteScroll
        :pagination="isPaginated" :items-length="state.items.length"
        :current-page="state.page" :total-pages="state.totalPages"
        @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch"
      >
        <FlowersTable :flowers="state.items" :is-local="data.isLocal" :no-flower-message="'This Flower has no descendants.'" />
      </PaginationOrInfiniteScroll>
    </div>
  </div>
</template>

<script setup>

    import { reactive, onMounted } from 'vue';
    import FlowerCard from '../components/FlowerCard.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
    import { useFlowerStore } from '../stores/FlowerStore';
    import { useErrorStore } from '../stores/ErrorStore';
    import * as flowerRepository from '../services/flowerRepository';
    import * as flowerApiClient from '../services/flowerApiClient';
    import { usePaginatedList } from '../composables/usePaginatedList';
    import { useRoute } from 'vue-router';

    const FlowerStore = useFlowerStore();
    const ErrorStore = useErrorStore();
    const routes = useRoute();
    const isLocal = routes.params.isLocal === "local";
    const fatherID = parseInt(routes.params.father);
    // with a father only they are the descendants of a flower, as father or as mother
    const hasFatherOnly = routes.params.mother === undefined;
    const motherID = hasFatherOnly ? undefined : parseInt(routes.params.mother);
    const data = reactive({
        isLocal,
        flower1: { id: fatherID, genome: "", image: "" },
        flower2: { id: motherID ?? 0, genome: "", image: "" }
    });

    // the descendants in the local rows: each one is a flower of its own
    const readLocal = async ({ limit, offset }) => {
        const rows = hasFatherOnly
            ? await flowerRepository.listDescendantsByParent({ fatherID, limit, offset })
            : await flowerRepository.listDescendantsByParents({ fatherID, motherID, limit, offset });
        const flowers = await Promise.all(rows.map((d) => flowerRepository.getFlower(d.id)));
        // a descendant whose flower was deleted has nothing to show
        return flowers.filter((f) => f !== undefined);
    };
    const countLocal = () => {
        return hasFatherOnly ? flowerRepository.countDescendantsByParent(fatherID)
                             : flowerRepository.countDescendantsByParents(fatherID, motherID);
    };

    const { state, isPaginated, init, nextPage, prevPage, nextBatch } = usePaginatedList({
        // the descendants of the browser and those of the server are not the same list
        list: isLocal ? 'localDescendants' : 'remoteDescendants',
        // A reproduction makes a child of the two flowers that were selected, whichever list is on screen. The list
        // of a pair has the children of that pair, the father first as the table says; the list of one flower has
        // the children that have it as father or as mother. The others are in the list of their own parents, and not
        // in this one after the page is read again.
        accepts: (_, relation) => {
            if(!relation){
                return false;
            }
            return hasFatherOnly ? (relation.father === fatherID || relation.mother === fatherID)
                                 : (relation.father === fatherID && relation.mother === motherID);
        },
        fetchCount: () => {
            return isLocal ? countLocal()
                           // reports a server that cannot be reached, the pages do not
                           : FlowerStore.getRemoteDescendantsCount(fatherID, motherID);
        },
        fetchPage: ({ limit, offset }) => {
            return isLocal ? readLocal({ limit, offset })
                           : flowerApiClient.getDescendants(fatherID, motherID, { limit, offset }).catch(() => []);
        }
    });

    const remoteCard = (id) => ({ id, genome: id + '.json', image: id + '.png' });

    onMounted(async () => {
        // ?page= is the page to start at, the pages after it are not a route each
        init(parseInt(routes.query.page, 10) || 0);
        if(!isLocal){
            data.flower1 = remoteCard(fatherID);
            if(!hasFatherOnly){
                data.flower2 = remoteCard(motherID);
            }
            return;
        }
        try{
            // a flower that is not there is not drawn, its descendants are still listed
            data.flower1 = await flowerRepository.getFlower(fatherID) ?? data.flower1;
            if(!hasFatherOnly){
                data.flower2 = await flowerRepository.getFlower(motherID) ?? data.flower2;
            }
        }catch(e){
            ErrorStore.push(e);
        }
    });

</script>

<style scoped>
    .Descendants{
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
