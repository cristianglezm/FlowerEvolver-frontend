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
                <div>
                    <div id="limit-settings" class="option-box labelInputArea">
                        <ToolTip :info="'limit for how many flowers will it load at a time.'" />
                        <label for="setLimit">Limit per Page: </label>
                        <input type="number" id="setLimit" min="1" v-model.number="store.$state.settings.limit" />
                    </div>
                </div>
            </div>
            <div id="params-settings" class="settings-box">
                <h2>Creation parameters</h2>
                <div class="labelInputArea">
                    <ToolTip :info="'radius of the flower'" />
                    <label for="params-radius">Radius: </label>
                    <input type="number" id="params-radius" min="4" max="258" v-model.number="params.radius" @change="validateParams()"/>
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'number of layers, a layer is defined by radius / 2.0, the drawing algorithm will do another pass at half radius for each layer.'" />
                    <label for="params-num-layers">Number of Layers: </label>
                    <input type="number" id="params-num-layers" min="1" v-model.number="params.numLayers" @change="validateParams()"/>
                </div>
                <div class="labelInputArea">
                    <ToolTip :info="'the P parameter controls how many petals the flower will have.'" />
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
            <h2 style="color:red;">Actions - Danger Zone</h2>
            <button @click="deleteAllFlowers()"> Delete All Flowers </button>
            <button @click="deleteNonFavourites()"> Delete non Favourites </button>
            <button @click="showRedrawFlowers()"> redraw local Flowers </button>
            <button @click="exportFavourites()"> Export favourite flowers </button>
            <button @click="exportLocals()"> Export local Flowers</button>
        </div>
    </div>
</template>

<script setup>
/// @todo document, impl workers for export and import, fix oom bug in dev
import { reactive, inject, toRaw, onBeforeUnmount } from 'vue';
import ToolTip from '../components/ToolTip.vue';
import { useFlowersStore } from '../store';
import progressModal from '../components/progressModal.vue';
import redrawWorker from '../workers/redraw.worker?worker';

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
    exportWorker: null,
    importWorker: null
};

onBeforeUnmount(() => {
    workers.redrawWorker.terminate();
    /// @todo uncomment
    //workers.exportWorker.terminate();
    //workers.importWorker.terminate();
});

const clamp = (val, min, max) => {
    return Math.min(max, Math.max(val, min));
}
const validateParams = () => {
    params.radius = clamp(params.radius, 4, 258);
    params.numLayers = Math.max(1, params.numLayers);
    store.settings.params = params;
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
};
const deleteAllFlowers = () => {
    /// @todo review autoincrement needs to reset.
    emitter.emit('showYesNo', {
        title: 'delete all flowers',
        message: 'Are you sure you want to delete all flowers?',
        btnNo: 'no',
        btnYes: 'Delete all',
        onConfirm: (dialog) => {
            store.db.flowers.clear();
            store.db.favourites.clear();
            store.db.mutations.clear();
            store.db.descendants.clear();
            dialog.close();
        },
    });
};
const deleteNonFavourites = () => {
    /// @todo fix error - delete all
    emitter.emit('showYesNo', {
        title: 'Delete non favourites',
        message: 'Are you sure you want to delete all flowers but favourites?',
        btnNo: 'no',
        btnYes: 'Delete non favourites',
        onConfirm: async (dialog) => {
            let favs = await store.db.favourites.toArray();
            let ids = favs.map((f) => f.id);
            let flowers = await store.db.flowers.bulkGet(ids);
            store.db.flowers.clear();
            store.db.mutations.clear();
            store.db.descendants.clear();
            store.db.flowers.bulkAdd(flowers);
            dialog.close();
        }
    });
};
const redrawLocalFlowers = async () => {
    /// @todo fix oom error in web worker when env = dev
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
    store.db.flowers.count((totalFlowers) => {
        if(totalFlowers != 0){
            showProgressBar('re-drawing flowers', totalFlowers, redrawLocalFlowers);   
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
const exportArray = (array, downName) => {
    /// @todo use progressModal and move this into worker.
    let gen = {
        Generation: [],
    };
    array.forEach(f => {
        let json = JSON.parse(f.genome);
        gen.Generation.push(json.Flower);
    });
    const a = document.createElement("a");
    a.href = 'data:text/json;charset=utf-8,' + JSON.stringify(gen);
    a.download = downName;
    a.click();
};
const exportFavourites = () => {
    const handleError = (e) => {
        store.errors.push({message:e});
    };
    store.db.favourites.toArray()
        .then((favs) => {
            let ids = favs.map((f) => f.id);
            store.db.flowers.bulkGet(ids)
                .then((flowers) => {
                    exportArray(flowers, "favouriteFlowers.json");
                }).catch(handleError);
        }).catch(handleError);
};
const exportLocals = () => {
    store.db.flowers.toArray()
        .then((flowers) => {
            exportArray(flowers, "localFlowers.json");
        }).catch((e) => store.errors.push({message:e}));
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
        border: solid red;
        padding: 10px;
        margin-bottom: 20px;
        text-align: center;
        background-color: rgb(37, 39, 41);
        font-size: 20px;
    }
    #actions-settings button{
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
