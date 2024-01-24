<template>
    <div id="settings-container">
        <progressModal :id="'progressBar'" :channel="emitter" :on="'showProgress'" :update="'updateProgress'" />
        <h1>Settings</h1>
        <div id="settings-options" class="settings-box">
            <h2>Options</h2>
            <div id="pagination-option" class="option-box">
                <label for="pagination">Pagination: </label>
                <input type="checkbox" id="pagination" v-model="store.$state.settings.pagination" />
            </div>
            <div id="loadDemoFlowers-option" class="option-box">
                <label for="loadDemoFlowers">Load Demo Flowers: </label>
                <input type="checkbox" id="loadDemoFlowers" v-model="store.$state.settings.loadDemoFlowers" />
            </div>
            <div>
                <div id="limit-settings" class="option-box">
                    <label for="setLimit">Limit per Page: </label>
                    <input type="text" id="setLimit" v-model.number="store.$state.settings.limit" />
                </div>
            </div>
        </div>
        <div id="params-settings" class="settings-box">
            <h2>Flowers creation params</h2>
            <div>
                <label for="params-radius">Radius: </label>
                <input type="text" id="params-radius" v-model.number="params.radius" @change="validateParams()"/>
            </div>
            <div>
                <label for="params-num-layers">Number of Layers: </label>
                <input type="text" id="params-num-layers" v-model.number="params.numLayers" @change="validateParams()"/>
            </div>
            <div>
                <label for="params-p">P: </label>
                <input type="text" id="params-p" v-model.number="params.P" @change="validateParams()"/>
            </div>
            <div>
                <label for="params-bias">Bias: </label>
                <input type="text" id="params-bias" v-model.number="params.bias" @change="validateParams()"/>
            </div>
        </div>
        <div id="mutationRates-settings" class="settings-box">
            <h2>Mutation Rates</h2>
            <div>
                <label for="mutation-addNodeRate">Add Node Rate: </label>
                <input type="text" id="mutation-addNodeRate" v-model.number="mutationRates.addNodeRate" @change="validateMutationRates()" />
            </div>
            <div>
                <label for="mutation-addConnRate">Add Connection Rate: </label>
                <input type="text" id="mutation-addConnRate" v-model.number="mutationRates.addConnRate" @change="validateMutationRates()" />
            </div>
            <div>
                <label for="mutation-removeConnRate">Remove Connection Rate: </label>
                <input type="text" id="mutation-removeConnRate" v-model.number="mutationRates.removeConnRate" @change="validateMutationRates()" />
            </div>
            <div>
                <label for="mutation-perturbWeightsRate">Perturb Weights Rate: </label>
                <input type="text" id="mutation-perturbWeightsRate" v-model.number="mutationRates.perturbWeightsRate" @change="validateMutationRates()" />
            </div>
            <div>
                <label for="mutation-enableRate">Enable Rate: </label>
                <input type="text" id="mutation-enableRate" v-model.number="mutationRates.enableRate" @change="validateMutationRates()" />
            </div>
            <div>
                <label for="mutation-disableRate">Disable Rate: </label>
                <input type="text" id="mutation-disableRate" v-model.number="mutationRates.disableRate" @change="validateMutationRates()" />
            </div>
            <div>
                <label for="mutation-actTypeRate">Activation Type Rate: </label>
                <input type="text" id="mutation-actTypeRate" v-model.number="mutationRates.actTypeRate" @change="validateMutationRates()" />
            </div>
        </div>
        <div id="actions-settings" class="settings-box">
            <h2 style="color:red;">Actions - Danger Zone</h2>
            <button @click="deleteAllFlowers()"> Delete All Flowers </button>
            <button @click="showRedrawFlowers()"> redraw local Flowers </button>
            <button @click="exportFavourites()"> Export favourite flowers </button>
            <button @click="exportLocals()"> Export local Flowers</button>
        </div>
    </div>
</template>

<script setup>

import { reactive, inject, nextTick } from 'vue';
import { useFlowersStore } from '../store';
import progressModal from '../components/progressModal.vue';

const store = useFlowersStore();
let emitter = inject('emitter');

const params = reactive({
    radius: store.$state.settings.params.radius,
    numLayers: store.$state.settings.params.numLayers,
    P: store.$state.settings.params.P,
    bias: store.$state.settings.params.bias
});

const mutationRates = reactive({
    addNodeRate: store.$state.settings.mutationRates.addNodeRate,
    addConnRate: store.$state.settings.mutationRates.addConnRate,
    removeConnRate: store.$state.settings.mutationRates.removeConnRate,
    perturbWeightsRate: store.$state.settings.mutationRates.perturbWeightsRate,
    enableRate: store.$state.settings.mutationRates.enableRate,
    disableRate: store.$state.settings.mutationRates.disableRate,
    actTypeRate: store.$state.settings.mutationRates.actTypeRate
});

const validateParams = () => {
    store.$state.settings.params = params;
};
const validateMutationRates = () => {
    store.$state.settings.mutationRates = mutationRates;
};
const deleteAllFlowers = () => {
    /// @todo review autoincrement needs to reset.
    emitter.emit('showYesNo', {
        title: 'delete all flowers',
        message: 'Are you sure you want to delete all flowers?',
        btnNo: 'no',
        btnYes: 'Delete all',
        onConfirm: (dialog) => {
            store.$state.db.flowers.clear();
            store.$state.db.favourites.clear();
            store.$state.db.mutations.clear();
            store.$state.db.descendants.clear();
            dialog.close();
        },
    });
};
const redrawLocalFlowers = async () => {
    /// @todo remove console.logs -> fix progress not showing
    const updateFlower = (flower) => {
        store.$state.db.flowers.put(flower)
            .catch(() => store.$state.errors.push({message: e}));
    };
    const canvas = document.getElementById("canvas");
    let i = 1;
await nextTick();
    store.$state.db.flowers.toArray()
        .then((flowers) => {
            flowers.forEach(f => {
                emitter.emit('updateProgress', {
                    progress: i
                });
                ++i;
console.log("drawing flower", i);
                canvas.width = store.$state.settings.params.radius * 2;
                canvas.height = store.$state.settings.params.radius * 3;
                try{
                    store.$state.fe.drawFlower(f.genome, store.$state.settings.params.radius, 
                                            store.$state.settings.params.numLayers, 
                                            store.$state.settings.params.P, store.$state.settings.params.bias);
                }catch(e){
                    store.$state.errors.push({message: e});
                }
                f.image = canvas.toDataURL();
                updateFlower(f);
            });
        })
};
const showRedrawFlowers = () => {
    store.$state.db.flowers.count((totalFlowers) => {
        showProgressBar('re-drawing flowers', totalFlowers, redrawLocalFlowers);
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
    /// @todo use progressModal
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
        store.$state.errors.push({message:e});
    };
    store.$state.db.favourites.toArray()
        .then((favs) => {
            let ids = favs.map((f) => f.id);
            store.$state.db.flowers.bulkGet(ids)
                .then((flowers) => {
                    exportArray(flowers, "favouriteFlowers.json");
                }).catch(handleError);
        }).catch(handleError);
};
const exportLocals = () => {
    store.$state.db.flowers.toArray()
        .then((flowers) => {
            exportArray(flowers, "localFlowers.json");
        }).catch((e) => store.$state.errors.push({message:e}));
};
</script>

<style scoped>
#settings-container{
    color: lightgreen;
    background-color: rgb(37, 39, 41);
    font-size: 20px;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    position: relative;
}
#settings-options{
    margin: 0em 4em;
}
#params-settings{
    display: flex;
    flex-flow: column wrap;
    margin: 0em 4em;
}
#limit-settings input[type=text]{
    background-color: green;
    color: lightgreen;
    border: solid lightgreen;
    border-radius: 129px;
    margin: 2px 0px 0px 2px;
    width: 5%;
    text-align: center;
}
#params-settings input[type=text]{
    background-color: green;
    color: lightgreen;
    border: solid lightgreen;
    border-radius: 129px;
    margin: 2px 0px 0px 2px;
    width: 5%;
    text-align: center;
}
#mutationRates-settings{
    display: flex;
    flex-flow: column wrap;
    margin: 0em 4em;
}
#mutationRates-settings input[type=text]{
    background-color: green;
    color: lightgreen;
    border: solid lightgreen;
    border-radius: 129px;
    margin: 2px 0px 0px 2px;
    width: 5%;
    text-align: center;
    
}
#actions-settings{
    border: solid red;
    padding: 10px;
    margin-bottom: 20px;
    text-align: center;
}
#actions-settings button{
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
  }

  .option-box {
    margin-bottom: 10px;
  }
  @media only screen and (max-width: 1280px){
    #settings-container{
        font-size: 10px;
    }
    #limit-settings input[type=text]{
        width: 20%;
    }
    #params-settings input[type=text]{
        width: 20%;
    }
    #mutationRates-settings input[type=text]{
        width: 20%;
    }
  }
</style>
