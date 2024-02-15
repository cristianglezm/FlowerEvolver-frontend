<template>
    <div class="Local">
        <PaginationOrInfiniteScroll :pagination="isPaginated()" :items-length="flowers.length" 
                                    :current-page="data.page" :total-pages="data.totalPages"
                                    @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch">
            <FlowersTable :Flowers="flowers" :is-local="true" :no-flower-message="'There are no Flowers'" />
        </PaginationOrInfiniteScroll>
        <ProgressModal :id="'demoProgressBar'" :channel="emitter" :on="'showDemoProgress'" :update="'updateDemoProgress'" />
    </div>
</template>

<script setup>

import { nextTick, onMounted, reactive, computed, inject, watch } from 'vue';
import FlowersTable from '../components/FlowersTable.vue';
import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
import ProgressModal from '../components/ProgressModal.vue';
import { useFlowersStore } from '../store';
import { useRoute, useRouter } from 'vue-router';
import importWorker from '../workers/import.worker?worker';

const routes = useRoute();
const router = useRouter();
const store = useFlowersStore();
const emitter = inject('emitter');
const data = reactive({
    offset: 0,
    page: 0,
    totalPages: 0,
    demoFlowersFile: "/demoFlowers.json",
    killWorker: false
});
let worker = importWorker();
watch(data, () => {
    if(data.killWorker){
        worker.terminate();
    }
});
const flowers = computed(() => {
    return store.getLocalFlowers();
});
onMounted(() => {
    data.offset = 0;
    data.page = parseInt(routes.query.page, 10) || 0;
    if(isPaginated()){
        getFlowersFrom(data.page);
        store.getLocalFlowersCount().then(c => data.totalPages = Math.round(c / store.settings.limit));
    }else{
        store.updateLocalFlowers({limit: store.settings.limit, offset: data.offset});
        data.offset = store.increaseOffset(data.offset);
    }
    loadDemoFlowers();
});

const nextBatch = () => {
    updateFlowers(store.settings.limit, data.offset);
};
const updateFlowers = (limit, offset) => {
    store.updateAndConcatLocalFlowers({limit:limit, offset:offset});
    data.offset = store.increaseOffset(offset);
};
const getFlowersFrom = (page) => {
    nextTick(() => {
        data.offset = store.calcOffset(page);
        store.updateLocalFlowers({limit: store.settings.limit, offset: data.offset});
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
    return store.settings.pagination;
};

const loadDemoFlowersWorker = async () => {
    worker.onmessage = (e) => {
        let type = e.data.type;
        if(type === "showProgress"){
            emitter.emit('showDemoProgress', {
                title: e.data.title,
                progress: 0,
                total: e.data.total,
                onLoad: () => {}
            });
        }else if(type === "updateProgress"){
            emitter.emit('updateDemoProgress', {
                progress: e.data.progress,
            });
        }else if(type === "done"){
            data.offset = 0;
            nextBatch();
            data.killWorker = true;
        }
    };
    worker.onerror = (e) => {
        store.errors.push({message: e});
    };
    const blob = await fetch(data.demoFlowersFile)
            .then(response => {
                return response.blob();
            });
    const files = new Array(new File([blob], "demoFlowers.json", {type: "application/json"}));
    worker.postMessage({
        files: files,
        toFavs: false,
        batchSize: store.settings.limit
    });
};
const loadDemoFlowers = async () => {
    if(store.settings.loadDemoFlowers){
        loadDemoFlowersWorker();
        store.setLoadDemoFlowers(false);
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
