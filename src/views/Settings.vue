<template>
    <div style="background-color: rgb(37, 39, 41); padding: 0.6rem;">
        <div id="settings-container">
            <progressModal :id="'progressBar'" :channel="emitter" :on="'showProgress'" :update="'updateProgress'" />
            <UploadFileModal :id="'importModal'" :channel="emitter" :on="'showImport'" />
            <div id="settings-options" class="settings-box">
                <h2>Options</h2>
                <div id="pagination-option" class="option-box labelInputArea">
                    <ToolTip :info="'if checked pagination will be used, infinite Scroll otherwise.'" />
                    <label for="pagination">Pagination: </label>
                    <input type="checkbox" id="pagination" v-model="store.settings.pagination" @change="saveSettings()"/>
                </div>
                <div id="loadDemoFlowers-option" class="option-box labelInputArea">
                    <ToolTip :info="'if checked the demo flowers will load in Local.'" />
                    <label for="loadDemoFlowers">Load Demo Flowers: </label>
                    <input type="checkbox" id="loadDemoFlowers" v-model="store.settings.loadDemoFlowers" @change="saveSettings()"/>
                </div>
                <div id="persists-option" class="option-box labelInputArea">
                    <ToolTip :info="'it will keep data even when low on space'" />
                    <label for="persist">Persistent storage: </label>
                    <input type="checkbox" id="persist" v-model="data.persisted" @change="persist()"/>
                </div>
                <div>
                    <div id="limit-settings" class="option-box labelInputArea">
                        <ToolTip :info="'limit for how many flowers it will load at a time.'" />
                        <label for="setLimit">Limit per Page: </label>
                        <input type="number" id="setLimit" min="1" v-model.number="store.settings.limit" @change="saveSettings()"/>
                    </div>
                    <div style="color: lightgreen; text-align: center;"> 
                        <ToolTip :info="'Space used by the flowers (usage / quota) if persistent storage is enabled it will use a bit more space.'" />
                        {{ data.spaceUsage.toFixed(2) }} / {{ data.spaceQuota.toFixed(2) }} MB
                    </div>
                </div>
            </div>
            <div id="params-settings" class="settings-box">
                <h2>Creation parameters</h2>
                <div class="labelInputArea">
                    <ToolTip :info="'radius of the flower, min: 4 and max: 256, for bigger radius use the native app.'" />
                    <label for="params-radius">Radius: </label>
                    <input type="number" id="params-radius" min="4" max="256" v-model.number="params.radius" @change="validateParams()"/>
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'A layer is defined by radius / 2.0, the drawing algorithm will do another pass at half radius for each layer.'" />
                    <label for="params-num-layers">Number of Layers: </label>
                    <input type="number" id="params-num-layers" min="1" v-model.number="params.numLayers" @change="validateParams()"/>
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'It controls how many petals the flower will have.'" />
                    <label for="params-p">P: </label>
                    <input type="number" id="params-p" v-model.number="params.P" @change="validateParams()"/>
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'bias for the flower'" />
                    <label for="params-bias">Bias: </label>
                    <input type="number" id="params-bias" v-model.number="params.bias" @change="validateParams()"/>
                </div>
            </div>
            <div id="mutationRates-settings" class="settings-box">
                <h2>Mutation Rates</h2>
                <div class="labelInputArea">
                    <ToolTip :info="'the rate for adding nodes into the Genome of the Flower.'" />
                    <label for="mutation-addNodeRate">Add Node Rate: </label>
                    <input type="number" id="mutation-addNodeRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.addNodeRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The rate for adding connections into the Genome of the flower.'" />
                    <label for="mutation-addConnRate">Add Connection Rate: </label>
                    <input type="number" id="mutation-addConnRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.addConnRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The rate for removing connections from the Genome of the flower.'" />
                    <label for="mutation-removeConnRate">Remove Connection Rate: </label>
                    <input type="number" id="mutation-removeConnRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.removeConnRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The rate to perturb the weights of connections'" />
                    <label for="mutation-perturbWeightsRate">Perturb Weights Rate: </label>
                    <input type="number" id="mutation-perturbWeightsRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.perturbWeightsRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The rate to enable connections'" />
                    <label for="mutation-enableRate">Enable Rate: </label>
                    <input type="number" id="mutation-enableRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.enableRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The rate to disable connections'" />
                    <label for="mutation-disableRate">Disable Rate: </label>
                    <input type="number" id="mutation-disableRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.disableRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The rate to change the activation type in a random node'" />
                    <label for="mutation-actTypeRate">Activation Type Rate: </label>
                    <input type="number" id="mutation-actTypeRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.actTypeRate" @change="validateMutationRates()" />
                </div>
            </div>
        </div>
        <div id="actions-settings">
            <div id="actions-safe">
                <h2 style="color:lightgreen;">Actions</h2>
                <button @click="showRedrawFlowers()"> redraw local Flowers </button>
                <button @click="showExport('favourites')"> Export favourite flowers </button>
                <button @click="showExport('all')"> Export local Flowers </button>
                <button @click="showImport(false)"> Import Flowers </button>
                <button @click="showImport(true)"> Import Flowers to favourites </button>
            </div>
            <div id="actions-danger">
                <h2 style="color:red;">Danger Zone</h2>
                <button @click="deleteAllFlowers()"> Delete All Flowers </button>
                <button @click="deleteNonFavourites()"> Delete non Favourites </button>
            </div>
        </div>
    </div>
</template>

<script setup>
/**
 * Settings View
 * View for managing application settings and performing various 
 * actions such as exporting, importing, and deleting flowers.
 *
 * @component Settings
 * @example
 * // Component usage in another component or view.
 * <template>
 *    <Settings />
 * </template>
 * // then in script setup
 *  import Settings from '@/views/Settings.vue';
 **/
import { reactive, inject, toRaw, onBeforeUnmount, onMounted } from 'vue';
import ToolTip from '../components/ToolTip.vue';
import { useFlowersStore, STORAGE_KEY } from '../store';
import progressModal from '../components/progressModal.vue';
import UploadFileModal from '../components/UploadFileModal.vue';
import redrawWorker from '../workers/redraw.worker?worker';
import exportWorker from '../workers/export.worker?worker';
import importWorker from '../workers/import.worker?worker';

const store = useFlowersStore();
let emitter = inject('emitter');

const params = reactive({
    radius: store.settings.params.radius,
    numLayers: store.settings.params.numLayers,
    P: store.settings.params.P,
    bias: store.settings.params.bias
});

const mutationRates = reactive({
    addNodeRate: store.settings.mutationRates.addNodeRate,
    addConnRate: store.settings.mutationRates.addConnRate,
    removeConnRate: store.settings.mutationRates.removeConnRate,
    perturbWeightsRate: store.settings.mutationRates.perturbWeightsRate,
    enableRate: store.settings.mutationRates.enableRate,
    disableRate: store.settings.mutationRates.disableRate,
    actTypeRate: store.settings.mutationRates.actTypeRate
});
const workers = {
    redrawWorker: redrawWorker(),
    exportWorker: exportWorker(),
    importWorker: importWorker()
};

const persist = async () => {
    if(!navigator.storage && !navigator.storage.persist){
        return;
    }
    data.persisted  = await navigator.storage.persist();
};
const isPersisted = async () => {
    if(!navigator.storage && !navigator.storage.persisted){
        return false;
    }
    return await navigator.storage.persisted();
};
const calcSpace = async () => {
    if(navigator.storage && navigator.storage.estimate){
        const estimation = await navigator.storage.estimate();
        data.spaceUsage = (estimation.usage / 1e+6);
        data.spaceQuota = (estimation.quota / 1e+6);
    }else{
        data.spaceUsage = 0.0;
        data.spaceQuota = 0.0;
    }
};
const data = reactive({
    persisted: false,
    spaceUsage: 0.0,
    spaceQuota: 0.0
});
onMounted(() => {
    isPersisted().then(p => data.persisted = p);
    calcSpace();
});
onBeforeUnmount(() => {
    workers.redrawWorker.terminate();
    workers.exportWorker.terminate();
    workers.importWorker.terminate();
});

const clamp = (val, min, max) => {
    return Math.min(max, Math.max(val, min));
}
const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.settings));
};
const validateParams = () => {
    params.radius = clamp(params.radius, 4, 256);
    params.numLayers = Math.max(1, params.numLayers);
    store.settings.params = params;
    saveSettings();
};
const validateMutationRates = () => {
    mutationRates.actTypeRate = clamp(mutationRates.actTypeRate, 0.0, 1.0);
    mutationRates.addConnRate = clamp(mutationRates.addConnRate, 0.0, 1.0);
    mutationRates.addNodeRate = clamp(mutationRates.addNodeRate, 0.0, 1.0)
    mutationRates.disableRate = clamp(mutationRates.disableRate, 0.0, 1.0)
    mutationRates.enableRate = clamp(mutationRates.enableRate, 0.0, 1.0)
    mutationRates.perturbWeightsRate = clamp(mutationRates.perturbWeightsRate, 0.0, 1.0)
    mutationRates.removeConnRate = clamp(mutationRates.removeConnRate, 0.0, 1.0)
    store.settings.mutationRates = mutationRates;
    saveSettings();
};
const deleteAllFlowers = () => {
    emitter.emit('showYesNo', {
        title: 'delete all flowers',
        message: 'Are you sure you want to delete all flowers?',
        btnNo: 'no',
        btnYes: 'Delete all',
        onConfirm: (dialog) => {
            store.db.delete();
            store.db.open();
            dialog.close();
        },
    });
};
const deleteNonFavourites = () => {
    emitter.emit('showYesNo', {
        title: 'Delete non favourites',
        message: 'Are you sure you want to delete all flowers but favourites?',
        btnNo: 'no',
        btnYes: 'Delete non favourites',
        onConfirm: async (dialog) => {
            let ids = await store.db.favourites.toArray();
            let flowers = await store.db.flowers.bulkGet(ids);
            for(let id = 1;id < flowers.length; ++id){
                ids[id] = id;
                flowers[id].id = id;
            }
            store.db.delete();
            store.db.open();
            store.db.flowers.bulkAdd(flowers);
            store.db.favourites.bulkAdd(ids, ids);
            dialog.close();
        }
    });
};
const redrawLocalFlowers = async () => {
    workers.redrawWorker.onmessage = (e) => {
        emitter.emit('updateProgress', {
            progress: e.data.progress,
        });
    };
    workers.redrawWorker.onerror = (e) => {
        store.errors.push({message: "redraw Web Worker had an error."});
    };
    workers.redrawWorker.postMessage({
        batchSize: store.settings.limit,
        params: structuredClone(toRaw(params))
    });
};
const showRedrawFlowers = () => {
    emitter.emit('showYesNo', {
        title: 'Redraw local flowers',
        message: 'Are you sure you want to redraw local flowers?',
        btnNo: 'no',
        btnYes: 'redraw local flowers',
        onConfirm: (dialog) => {
            store.db.flowers.count((totalFlowers) => {
                if(totalFlowers != 0){
                    showProgressBar('re-drawing flowers', totalFlowers, redrawLocalFlowers);   
                }else{
                    store.errors.push({message: "You have no local flowers to redraw."});
                }
            });
            dialog.close();
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
            onConfirm: (dialog) => {
                store.db.favourites.count((totalFlowers) => {
                    if(totalFlowers != 0){
                        showProgressBar('exporting favourite flowers', totalFlowers, 
                            () => {
                                exportFlowers(type);
                            });
                    }else{
                        store.errors.push({message: "You have no favourites to export"});
                    }
                });
                dialog.close();
            }
        });
    }else{
        emitter.emit('showYesNo', {
            title: 'Export all flowers',
            message: 'Are you sure you want to export all local flowers?',
            btnNo: 'no',
            btnYes: 'Export all local flowers',
            onConfirm: (dialog) => {
                store.db.flowers.count((totalFlowers) => {
                    if(totalFlowers != 0){
                        showProgressBar('exporting flowers', totalFlowers, 
                            () => {
                                exportFlowers(type);
                            });
                    }else{
                        store.errors.push({message: "You have no flowers to export"});
                    }
                });
                dialog.close();
            }
        });
    }
};
const importFiles = async (files, toFavs) => {
    if(!files.length){
        store.errors.push({message: "You must upload at least one json file."});
        return;
    }
    workers.importWorker.onmessage = (e) => {
        let type = e.data.type;
        if(type === "showProgress"){
            showProgressBar(e.data.title, e.data.total, () => {});
        }else if(type === "updateProgress"){
            emitter.emit('updateProgress', {
                progress: e.data.progress,
            });
        }
    };
    workers.importWorker.onerror = (e) => {
        store.errors.push({message: e});
    };
    workers.importWorker.postMessage({
        files: files,
        toFavs: toFavs,
        batchSize: store.settings.limit,
        params: structuredClone(toRaw(params))
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
    workers.exportWorker.onmessage = (e) => {
        let type = e.data.type;
        let ready = e.data.ready;
        if(type == "favourites"){
            if(ready){
                let gen = e.data.filedata;
                const a = document.createElement("a");
                a.href = 'data:text/json;charset=utf-8,' + JSON.stringify(gen);
                a.download = "favouritesFlowers.json";
                a.click();
            }else{
                emitter.emit('updateProgress', {
                    progress: e.data.progress,
                });
            }
        }else if(type == "all"){
            if(ready){
                let gen = e.data.filedata;
                const a = document.createElement("a");
                a.href = 'data:text/json;charset=utf-8,' + JSON.stringify(gen);
                a.download = "localFlowers.json";
                a.click();
            }else{
                emitter.emit('updateProgress', {
                    progress: e.data.progress,
                });
            }
        }
    };
    workers.exportWorker.onerror = (e) => {
        store.errors.push({message: "export Web Worker had an error."});
    };
    workers.exportWorker.postMessage({
        type: type,
        batchSize: store.settings.limit
    });
};

</script>

<style scoped>
    #settings-container{
        color: lightgreen;
        background-color: rgb(37, 39, 41);
        font-size: 1.25rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(26.8rem, 1fr));
        grid-gap: 0.6rem;
        position: relative;
    }
    #settings-options{
        margin: 1em 1em;
        background-color: green;
    }
    #params-settings{
        display: flex;
        flex-flow: column wrap;
        margin: 1em 1em;
        background-color: green;
    }
    .labelInputArea {
        display: block;
        padding-top: 0.31rem;
    }
    .labelInputArea label{
        width: 18.3rem;
        display: inline-block;
        margin: 0rem 0rem 0rem 0.93rem;
    }
    .labelInputArea input[type=checkbox]{
        background-color: green;
        color:lightgreen;
        border: solid lightgreen;
        cursor: pointer;
        display: inline-grid;
        place-content: center;
        grid-template-columns: 0.5em auto;
        gap: 0.1em;
        font-size: 2rem;
        font-weight: bold;
        -webkit-appearance: none;
        appearance: none;
        box-shadow: inset 0rem 0rem 0.2rem 0.125rem black;
    }
    .labelInputArea input[type="checkbox"]::before {
        content: "";
        width: 0.65em;
        height: 0.65em;
        transform: scale(0);
        transition: 120ms transform cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: inset 2em 2em lightgreen;
        transform-origin: top left;
        clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
    }
    .labelInputArea input[type="checkbox"]:checked::before {
        transform: scale(1);
    }
    .labelInputArea input[type=number]{
        vertical-align:top;
        background-color: green;
        color: lightgreen;
        border: solid lightgreen;
        border-radius: 8rem;
        margin: 0.125rem 0rem 0rem 0.125rem;
        width: 15%;
        text-align: center;
    }
    #mutationRates-settings{
        display: flex;
        flex-flow: column wrap;
        margin: 1em 1em;
        border-radius: 1.25rem;
        background-color: green;
    }
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
    #actions-safe button{
        position: relative;
        font-size: 1.25rem;
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        margin: 0.6rem 0.6rem 0rem 1.25rem;
        cursor: pointer;
        border-color: lightgreen;
        background-color: green;
        color: lightgreen;
    }
    #actions-safe button:hover{
        background-color: lightgreen;
        border-color: green;
        color: green;
    }
    #actions-danger button{
        position: relative;
        font-size: 1.25rem;
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        margin: 0.6rem 0.6rem 0rem 1.25rem;
        cursor: pointer;
        border-color: whitesmoke;
        background-color: red;
        color: whitesmoke;
    }
    #actions-danger button:hover{
        border-color: red;
        background-color: whitesmoke;
        color: red;
    }
    .settings-box {
        border: 0.25rem solid lightgreen;
        padding: 0.6rem;
        margin-bottom: 1.25rem;
        border-radius: 2rem;
    }
    .settings-box h2{
        text-align: center;
    }
    .option-box {
        margin-bottom: 0.6rem;
    }
    @media only screen and (max-width: 1280px){
        .labelInputArea label{
            width: 10.6rem;
            display: inline-block;
            margin: 0rem 0rem 0rem 0.93rem;
        }
        #settings-container{
            font-size: 0.9rem;
            grid-template-columns: repeat(auto-fill, minmax(24.3rem, 1fr));
        }
        #actions-safe{
            margin: 0.2rem;
        }
        #actions-safe button{
            font-size: 0.9rem;
        }
        #actions-danger{
            margin: 0.2rem;
        }
        #actions-danger button{
            font-size: 0.9rem;
        }
        input[type=number]{
            width: 20%;
        }
    }
    @media screen and (max-width: 400px){
        #settings-container{
            font-size: 0.9rem;
            grid-template-columns: repeat(auto-fill, minmax(20.3rem, 1fr));
        }
    }
    input[type=number] {
        appearance: textfield;
        box-shadow: inset 0rem 0rem 0.3rem 0.125rem black;
    }

</style>
