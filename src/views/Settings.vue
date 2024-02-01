<template>
    <div style="background-color: rgb(37, 39, 41); padding: 10px;">
        <div id="settings-container">
            <progressModal :id="'progressBar'" :channel="emitter" :on="'showProgress'" :update="'updateProgress'" />
            <div id="settings-options" class="settings-box">
                <h2>Options</h2>
                <div id="pagination-option" class="option-box labelInputArea">
                    <ToolTip :info="'if true pagination will be used, infinite Scroll otherwise.'" />
                    <label for="pagination">Pagination: </label>
                    <input type="checkbox" id="pagination" v-model="store.$state.settings.pagination" />
                </div>
                <div id="loadDemoFlowers-option" class="option-box labelInputArea">
                    <ToolTip :info="'if true the demo flowers will load in Local.'" />
                    <label for="loadDemoFlowers">Load Demo Flowers: </label>
                    <input type="checkbox" id="loadDemoFlowers" v-model="store.$state.settings.loadDemoFlowers" />
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
                        <input type="number" id="setLimit" min="1" v-model.number="store.$state.settings.limit" />
                    </div>
                    <div style="color: lightgreen; text-align: center;"> 
                        <ToolTip :info="'Space used by the flowers (usage / quota)'" />
                        {{ data.spaceUsage.toFixed(2) }} / {{ data.spaceQuota.toFixed(2) }} MB
                    </div>
                </div>
            </div>
            <div id="params-settings" class="settings-box">
                <h2>Creation parameters</h2>
                <div class="labelInputArea">
                    <ToolTip :info="'radius of the flower, min: 4 and max: 258, for bigger radius use the native app.'" />
                    <label for="params-radius">Radius: </label>
                    <input type="number" id="params-radius" min="4" max="258" v-model.number="params.radius" @change="validateParams()"/>
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
                    <ToolTip :info="'the ratio for adding nodes into the Genome of the Flower.'" />
                    <label for="mutation-addNodeRate">Add Node Rate: </label>
                    <input type="number" id="mutation-addNodeRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.addNodeRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The ratio for adding connections into the Genome of the flower.'" />
                    <label for="mutation-addConnRate">Add Connection Rate: </label>
                    <input type="number" id="mutation-addConnRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.addConnRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The ratio for removing connections from the Genome of the flower.'" />
                    <label for="mutation-removeConnRate">Remove Connection Rate: </label>
                    <input type="number" id="mutation-removeConnRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.removeConnRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The ratio to perturb the weights of connections'" />
                    <label for="mutation-perturbWeightsRate">Perturb Weights Rate: </label>
                    <input type="number" id="mutation-perturbWeightsRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.perturbWeightsRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The ratio to enable connections'" />
                    <label for="mutation-enableRate">Enable Rate: </label>
                    <input type="number" id="mutation-enableRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.enableRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The ratio to disable connections'" />
                    <label for="mutation-disableRate">Disable Rate: </label>
                    <input type="number" id="mutation-disableRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.disableRate" @change="validateMutationRates()" />
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'The ratio to change the actiovation from a random node'" />
                    <label for="mutation-actTypeRate">Activation Type Rate: </label>
                    <input type="number" id="mutation-actTypeRate" min="0.0" max="1.0" 
                        v-model.number="mutationRates.actTypeRate" @change="validateMutationRates()" />
                </div>
            </div>
        </div>
        <div id="actions-settings" class="settings-box">
            <div id="actions-safe">
                <h2 style="color:lightgreen;">Actions</h2>
                <button @click="showRedrawFlowers()"> redraw local Flowers </button>
                <button @click="showExport('favourites')"> Export favourite flowers </button>
                <button @click="showExport('all')"> Export local Flowers </button>
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
/// @todo document, impl import worker
import { reactive, inject, toRaw, onBeforeUnmount, onMounted } from 'vue';
import ToolTip from '../components/ToolTip.vue';
import { useFlowersStore, STORAGE_KEY } from '../store';
import progressModal from '../components/progressModal.vue';
import redrawWorker from '../workers/redraw.worker?worker';
import exportWorker from '../workers/export.worker?worker';

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
    importWorker: null
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
    /// @todo uncomment
    workers.exportWorker.terminate();
    //workers.importWorker.terminate();
});

const clamp = (val, min, max) => {
    return Math.min(max, Math.max(val, min));
}
const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.settings));
};
const validateParams = () => {
    params.radius = clamp(params.radius, 4, 258);
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
    let wcanvas = document.createElement("canvas").transferControlToOffscreen();
    workers.redrawWorker.postMessage({
        canvas: wcanvas, 
        params: structuredClone(toRaw(params))}, [wcanvas]);
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
                }
            });
            dialog.close();
        },
    });
};
// @todo add confirmModal?
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
        type: type
    });
};

</script>

<style scoped>

    #settings-container{
        color: lightgreen;
        background-color: rgb(37, 39, 41);
        font-size: 20px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
        grid-gap: 10px;
        position: relative;
    }
    #settings-options{
        margin: 1em 1em;
    }
    #params-settings{
        display: flex;
        flex-flow: column wrap;
        margin: 1em 1em;
    }
    .labelInputArea {
        display:block;
        padding-top:5px;
    }
    .labelInputArea label{
        width: 293px;
        display: inline-block;
        margin: 0px 0px 0px 15px;
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
        border-radius: 129px;
        margin: 2px 0px 0px 2px;
        width: 15%;
        text-align: center;
    }
    #mutationRates-settings{
        display: flex;
        flex-flow: column wrap;
        margin: 1em 1em;
        border-radius: 20px;
    }
    #actions-settings{
        border: solid lightgreen;
        padding: 10px;
        margin-bottom: 20px;
        text-align: center;
        background-color: rgb(37, 39, 41);
        font-size: 20px;
    }
    #actions-safe{
        padding: 10px;
    }
    #actions-danger{
        border: solid red;
        border-radius: 20px;
        padding: 10px;
        margin-bottom: 20px;
        text-align: center;
    }
    #actions-safe button{
        border-radius: 120px;
        position: relative;
        font-size: 20px;
        border-radius: 315px 335px 155px 135px;
        margin: 10px 10px 0px 2px;
        cursor: pointer;
        border-color: lightgreen;
        background-color: green;
        color: lightgreen;
    }
    #actions-danger button{
        border-radius: 120px;
        position: relative;
        font-size: 20px;
        border-radius: 315px 335px 155px 135px;
        margin: 10px 10px 0px 2px;
        cursor: pointer;
        border-color: whitesmoke;
        background-color: red;
        color: whitesmoke;
    }
    .settings-box {
        border: 2px solid lightgreen;
        padding: 10px;
        margin-bottom: 20px;
        border-radius: 80px;
    }
    .settings-box h2{
        text-align: center;
    }
    .option-box {
        margin-bottom: 10px;
    }
    @media only screen and (max-width: 1280px){
        .labelInputArea label{
            width: 170px;
            display: inline-block;
            margin: 0px 0px 0px 15px;
        }
        #settings-container{
            font-size: 10px;
            grid-template-columns: repeat(auto-fill, minmax(390px, 1fr));
        }
        #limit-settings input[type=number]{
            width: 20%;
        }
        #params-settings input[type=number]{
            width: 20%;
        }
        #mutationRates-settings input[type=number]{
            width: 20%;
        }
    }
    input[type=number] {
        appearance: textfield;
    }

</style>
