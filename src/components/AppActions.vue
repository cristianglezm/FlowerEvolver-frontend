<template>
  <UploadFileModal :id="'importModal'" :channel="emitter" :on="'showImport'" />
  <div id="actions-settings">
    <div id="actions-safe">
      <h2 style="color:lightgreen;">Actions</h2>
      <button class="safe-button" @click="showRedrawFlowers()"> Redraw local Flowers </button>
      <div class="columns">
        <div class="column">
          <button class="safe-button" @click="showExport('favourites')"> Export favourite flowers </button>
          <button class="safe-button" @click="showExport('garden')"> Export garden Flowers </button>
          <button class="safe-button" @click="showExport('all')"> Export local Flowers </button>
        </div>
        <div class="column">
          <button class="safe-button" @click="showImport(true)"> Import Flowers to favourites </button>
          <button class="safe-button" @click="importGarden()"> Import garden Flowers </button>
          <button class="safe-button" @click="showImport(false)"> Import Flowers </button>
        </div>
      </div>
    </div>
    <div id="actions-danger">
      <h2 style="color:red;">Danger Zone</h2>
      <button class="unsafe-button" @click="deleteAllFlowers()"> Delete All Flowers </button>
      <button class="unsafe-button" @click="deleteNonFavourites()"> Delete non Favourites </button>
    </div>
  </div>
</template>

<script setup>
import { inject, toRaw, onBeforeUnmount } from 'vue';
import { useFlowerStore, STORAGE_KEY_GARDEN } from '../stores/FlowerStore';
import UploadFileModal from '../components/UploadFileModal.vue';
import redrawWorker from '../workers/redraw.worker?worker';
import exportWorker from '../workers/export.worker?worker';
import importWorker from '../workers/import.worker?worker';
import WorkerManager from '../stores/WorkerManager';
import mitt from 'mitt';

const FlowerStore = useFlowerStore();
let emitter = inject('emitter');
let channel = mitt();
let wm = new WorkerManager(channel);

wm.addWorker('redraw', redrawWorker());
wm.addWorker('exporter', exportWorker());
wm.addWorker('importer', importWorker());

const onError = (e) => {
    FlowerStore.errors.push({ message: e});
};
wm.onError('redraw', onError);
wm.onResponse('redraw', (e) => {
    emitter.emit('updateProgress', {
        progress: e.progress,
    });
});
wm.onError('importer', onError);
wm.onResponse('importer', (e) => {
    let type = e.type;
    if(type === "showProgress"){
        showProgressBar(e.title, e.total, () => {});
    }else if(type === "updateProgress"){
        emitter.emit('updateProgress', {
            progress: e.progress,
        });
    }else if(type === "done"){
        emitter.emit('AppOptions#recalcSpace');
    }
});
wm.onError('exporter', onError);
wm.onResponse('exporter', (e) => {
    let type = e.type;
    let ready = e.ready;
    if(type == "favourites"){
        if(ready){
            let gen = e.filedata;
            const a = document.createElement("a");
            a.href = 'data:text/json;charset=utf-8,' + JSON.stringify(gen);
            a.download = "favouritesFlowers.json";
            a.click();
        }else{
            emitter.emit('updateProgress', {
                progress: e.progress,
            });
        }
    }else if(type == "all"){
        if(ready){
            let gen = e.filedata;
            const a = document.createElement("a");
            a.href = 'data:text/json;charset=utf-8,' + JSON.stringify(gen);
            a.download = "localFlowers.json";
            a.click();
        }else{
            emitter.emit('updateProgress', {
                progress: e.progress,
            });
        }
    }
});

onBeforeUnmount(() => {
    wm.deleteWorker('redraw');
    wm.deleteWorker('exporter');
    wm.deleteWorker('importer');
});

const deleteAllFlowers = () => {
    emitter.emit('showYesNo', {
        title: 'delete all flowers',
        message: 'Are you sure you want to delete all flowers?',
        btnNo: 'no',
        btnYes: 'Delete all',
        onConfirm: async () => {
            await FlowerStore.deleteAllFlowers();
            emitter.emit('AppOptions#recalcSpace');
        },
    });
};
const deleteNonFavourites = () => {
    emitter.emit('showYesNo', {
        title: 'Delete non favourites',
        message: 'Are you sure you want to delete all flowers but favourites?',
        btnNo: 'no',
        btnYes: 'Delete non favourites',
        onConfirm: async () => {
            await FlowerStore.deleteNonFavourites();
            emitter.emit('AppOptions#recalcSpace');
        }
    });
};
const redrawLocalFlowers = async () => {
    wm.sendRequest('redraw', {
        batchSize: FlowerStore.settings.limit,
        params: structuredClone(toRaw(FlowerStore.settings.params))
    });
};
const showRedrawFlowers = () => {
    emitter.emit('showYesNo', {
        title: 'Redraw local flowers',
        message: 'Are you sure you want to redraw local flowers? (this won\'t override their parameters but you will need to import them to restore to originals)',
        btnNo: 'no',
        btnYes: 'redraw local flowers',
        onConfirm: () => {
            FlowerStore.db.flowers.count((totalFlowers) => {
                if(totalFlowers != 0){
                    showProgressBar('re-drawing flowers', totalFlowers, redrawLocalFlowers);   
                }else{
                    FlowerStore.errors.push({message: "You have no local flowers to redraw."});
                }
            });
        },
    });
};
const showExport = (type) => {
    if(type == "favourites"){
        emitter.emit('showYesNo', {
            title: 'Export Favourite flowers',
            message: 'Are you sure you want to export your favourite flowers?',
            btnNo: 'no',
            btnYes: 'Export favourite flowers',
            onConfirm: () => {
                FlowerStore.db.favourites.count((totalFlowers) => {
                    if(totalFlowers != 0){
                        showProgressBar('exporting favourite flowers', totalFlowers, 
                            () => {
                                exportFlowers(type);
                            });
                    }else{
                        FlowerStore.errors.push({message: "You have no favourites to export"});
                    }
                });
            }
        });
    }else if(type == "all"){
        emitter.emit('showYesNo', {
            title: 'Export all flowers',
            message: 'Are you sure you want to export all local flowers?',
            btnNo: 'no',
            btnYes: 'Export all local flowers',
            onConfirm: () => {
                FlowerStore.db.flowers.count((totalFlowers) => {
                    if(totalFlowers != 0){
                        showProgressBar('exporting flowers', totalFlowers, 
                            () => {
                                exportFlowers(type);
                            });
                    }else{
                        FlowerStore.errors.push({message: "You have no flowers to export"});
                    }
                });
            }
        });
    }else if(type == "garden"){
        emitter.emit('showYesNo', {
            title: 'Export all garden flowers',
            message: 'Are you sure you want to export all garden flowers?',
            btnNo: 'no',
            btnYes: 'Export all garden flowers',
            onConfirm: () => {
                exportFlowers(type);
            }
        });
    }
};
const importFiles = async (files, toFavs) => {
    if(!files.length){
        FlowerStore.errors.push({message: "You must upload at least one json file."});
        return;
    }
    wm.sendRequest('importer', {
        files: files,
        toFavs: toFavs,
        batchSize: FlowerStore.settings.limit
    });
};
const importGarden = async () => {
    let files = new Array();
    files.push(new File([sessionStorage.getItem(STORAGE_KEY_GARDEN)], "gardenFlowers.json", {
        type: "application/json",
    }));
    const toFavs = false;
    wm.sendRequest('importer', {
        files: files,
        toFavs: toFavs,
        batchSize: FlowerStore.settings.limit
    });
};
const showImport = (toFavs) => {
    emitter.emit('showImport', {
        title: "Import Flowers",
        btnCancel: "Cancel",
        btnUpload: "Import Files",
        onUpload: async (dialog, files) => {
            await importFiles(files, toFavs);
            dialog.close();
        }
    });
};
const showProgressBar = (title, total, fn) => {
    emitter.emit('showProgress', {
        title: title,
        progress: 0,
        total: total,
        onLoad: fn
    });
};
const exportFlowers = (type) => {
    if(type == "garden"){
        const a = document.createElement("a");
        a.href = 'data:text/json;charset=utf-8,' + sessionStorage.getItem(STORAGE_KEY_GARDEN);
        a.download = "gardenFlowers.json";
        a.click();
        return;
    }
    wm.sendRequest('exporter', {
        type: type,
        batchSize: FlowerStore.settings.limit
    });
};

</script>

<style scoped>
    #actions-settings{
        padding: 0.6rem;
        text-align: center;
        background-color: rgb(37, 39, 41);
        font-size: 1.25rem;
        display: flex;
        flex-flow: row nowrap;
    }
    #actions-safe{
        padding: 0.6rem;
        margin: 0.6rem;
        background-color: green;
        border: solid lightgreen;
        width: 100%;
        border-radius: 1.25rem;
    }
    .columns {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
        justify-content: center;
    }
    .column {
        width: 100%;
        padding: 0.125rem;
        overflow-y: auto;
    }
    .safe-button{
        position: relative;
        font-size: 1.25rem;
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        margin: 0.6rem 0.6rem 0rem 1.25rem;
        cursor: pointer;
        border-color: lightgreen;
        background-color: green;
        color: lightgreen;
    }
    .safe-button:hover{
        background-color: lightgreen;
        border-color: green;
        color: green;
    }
    #actions-danger{
        border: solid red;
        border-radius: 1.25rem;
        margin: 0.6rem;
        padding: 0.6rem;
        margin-bottom: 1.25rem;
        width: 100%;
        text-align: center;
        background-color: green;
    }
    .unsafe-button{
        position: relative;
        font-size: 1.25rem;
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        margin: 0.6rem 0.6rem 0rem 1.25rem;
        cursor: pointer;
        border-color: whitesmoke;
        background-color: red;
        color: whitesmoke;
    }
    .unsafe-button:hover{
        border-color: red;
        background-color: whitesmoke;
        color: red;
    }
    @media only screen and (max-width: 1280px){
        #actions-settings{
            font-size: 0.9rem;
            flex-flow: row wrap;
        }
        .safe-button{
            font-size: 0.9rem;
        }
        .unsafe-button{
            font-size: 0.9rem;
        }
        #actions-safe{
            margin: 0.2rem;
        }
        #actions-danger{
            margin: 0.2rem;
        }
    }

</style>

