<template>
  <div class="Local">
    <PaginationOrInfiniteScroll
      :pagination="isPaginated()" :items-length="flowers.length" 
      :current-page="data.page" :total-pages="data.totalPages"
      @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch"
    >
      <FlowersTable :flowers="flowers" :is-local="true" :no-flower-message="'There are no Flowers'" />
    </PaginationOrInfiniteScroll>
  </div>
</template>

<script setup>

import { nextTick, onMounted, reactive, computed, inject, watch } from 'vue';
import FlowersTable from '../components/FlowersTable.vue';
import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
import { useFlowerStore } from '../stores/FlowerStore';
import { useCaptionerStore } from '../stores/CaptionerStore';
import { useRoute, useRouter } from 'vue-router';
import importWorker from '../workers/import.worker?worker';
import WorkerManager from '../stores/WorkerManager';
import mitt from 'mitt';

const routes = useRoute();
const router = useRouter();
const FlowerStore = useFlowerStore();
const CaptionerStore = useCaptionerStore();
const emitter = inject('emitter');
let channel = mitt();
let wm = new WorkerManager(channel);

wm.addWorker('importer', importWorker());

const data = reactive({
    offset: 0,
    page: 0,
    totalPages: 0,
    demoFlowersFile: import.meta.env.BASE_URL + "demoFlowers.json",
    killWorker: false
});
watch(data, () => {
    if(data.killWorker){
        wm.deleteWorker('importer');
    }
});
const flowers = computed(() => {
    return FlowerStore.getLocalFlowers();
});
onMounted(() => {
    data.offset = 0;
    data.page = parseInt(routes.query.page, 10) || 0;
    if(isPaginated()){
        getFlowersFrom(data.page);
        FlowerStore.getLocalFlowersCount().then(c => data.totalPages = Math.round(c / FlowerStore.settings.limit));
    }else{
        FlowerStore.updateLocalFlowers({limit: FlowerStore.settings.limit, offset: data.offset});
        CaptionerStore.loadLocalDescriptions(data.offset, FlowerStore.settings.limit);
        data.offset = FlowerStore.increaseOffset(data.offset);
    }
    loadDemoFlowers();
});

const nextBatch = () => {
    updateFlowers(FlowerStore.settings.limit, data.offset);
};
const onError = (e) => {
    FlowerStore.errors.push({ message: e});
};
wm.onError('importer', onError);
wm.onResponse('importer', (e) => {
    let type = e.type;
    if(type === "showProgress"){
        emitter.emit('showProgress', {
            title: e.title,
            progress: 0,
            total: e.total,
            onLoad: () => {}
        });
    }else if(type === "updateProgress"){
        emitter.emit('updateProgress', {
            progress: e.progress,
        });
    }else if(type === "done"){
        data.offset = 0;
        nextBatch();
        data.killWorker = true;
    }
});
const updateFlowers = (limit, offset) => {
    FlowerStore.updateAndConcatLocalFlowers({limit:limit, offset:offset});
    CaptionerStore.loadAndConcatLocalDescriptions(offset, limit);
    data.offset = FlowerStore.increaseOffset(offset);
};
const getFlowersFrom = (page) => {
    nextTick(() => {
        data.offset = FlowerStore.calcOffset(page);
        FlowerStore.updateLocalFlowers({limit: FlowerStore.settings.limit, offset: data.offset});
        CaptionerStore.loadLocalDescriptions(data.offset, FlowerStore.settings.limit);
    });
};
const prevPage = () => {
    if(data.page >= 1){
        data.page -= 1;
        router.push({path:"Local", query:{page: data.page}});
    }
};
const nextPage = () => {
    if(data.page < data.totalPages){
        data.page += 1;
        router.push({path:"Local", query:{page: data.page}});
    }
};
const isPaginated = () => {
    return FlowerStore.settings.pagination;
};

const loadDemoFlowers = async () => {
    if(FlowerStore.settings.loadDemoFlowers){
        const blob = await fetch(data.demoFlowersFile)
                .then(response => {
                    return response.blob();
                });
        const files = new Array(new File([blob], "demoFlowers.json", {type: "application/json"}));
        wm.sendRequest('importer', {
            files: files,
            toFavs: false,
            batchSize: FlowerStore.settings.limit
        });
        FlowerStore.setLoadDemoFlowers(false);
    }else{
        data.killWorker = true;
    }
};

</script>

<style scoped>
    .Local{
        background-color: rgb(37, 39, 41);
    }
</style>
