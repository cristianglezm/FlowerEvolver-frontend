<template>
  <div class="Local">
    <PaginationOrInfiniteScroll
      :pagination="isPaginated" :items-length="state.items.length"
      :current-page="state.page" :total-pages="state.totalPages"
      @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch"
    >
      <FlowersTable :flowers="state.items" :is-local="true" :no-flower-message="'There are no Flowers'" />
    </PaginationOrInfiniteScroll>
  </div>
</template>

<script setup>

import { onMounted, reactive, inject, watch } from 'vue';
import FlowersTable from '../components/FlowersTable.vue';
import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
import { useSettingsStore } from '../stores/SettingsStore';
import { useErrorStore } from '../stores/ErrorStore';
import { useCaptionerStore } from '../stores/CaptionerStore';
import * as flowerRepository from '../services/flowerRepository';
import { usePaginatedList } from '../composables/usePaginatedList';
import { useRoute } from 'vue-router';
import importWorker from '../workers/import.worker?worker';
import WorkerManager from '../stores/WorkerManager';
import mitt from 'mitt';

const routes = useRoute();
const SettingsStore = useSettingsStore();
const ErrorStore = useErrorStore();
const CaptionerStore = useCaptionerStore();
const emitter = inject('emitter');
let channel = mitt();
let wm = new WorkerManager(channel);

wm.addWorker('importer', importWorker());

const data = reactive({
    demoFlowersFile: import.meta.env.BASE_URL + "demoFlowers.json",
    killWorker: false
});
watch(data, () => {
    if(data.killWorker){
        wm.deleteWorker('importer');
    }
});

// The list is this view's own: the menu and the cards say when a flower is made or deleted (list 'local')
// and the composable applies it.
const { state, isPaginated, init, nextPage, prevPage, nextBatch } = usePaginatedList({
    list: 'local',
    fetchCount: () => flowerRepository.countFlowers(),
    fetchPage: ({ limit, offset }) => flowerRepository.listFlowers({ limit, offset }),
    // the descriptions are paged like the flowers: a page replaces those of the page before, a batch adds to them
    onLoaded: ({ offset, limit, append }) => {
        return append ? CaptionerStore.loadAndConcatLocalDescriptions(offset, limit)
                      : CaptionerStore.loadLocalDescriptions(offset, limit);
    }
});

onMounted(() => {
    // ?page= is the page to start at, the pages after it are not a route each
    init(parseInt(routes.query.page, 10) || 0);
    loadDemoFlowers();
});

const onError = (e) => {
    ErrorStore.push(e);
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
        // what was imported is not in the list yet, nor in the count of pages
        init();
        data.killWorker = true;
    }
});

const loadDemoFlowers = async () => {
    if(SettingsStore.settings.loadDemoFlowers){
        const blob = await fetch(data.demoFlowersFile)
                .then(response => {
                    return response.blob();
                });
        const files = new Array(new File([blob], "demoFlowers.json", {type: "application/json"}));
        wm.sendRequest('importer', {
            files: files,
            toFavs: false,
            batchSize: SettingsStore.settings.limit
        });
        SettingsStore.setLoadDemoFlowers(false);
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
