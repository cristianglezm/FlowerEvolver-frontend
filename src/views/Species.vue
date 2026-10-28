<template>
  <div class="Species">
    <p v-if="data.failed" class="message" data-testid="species-error">The species classifier could not be started.</p>
    <p v-else-if="!SpeciesStore.isReady" class="message" data-testid="species-loading">Starting the species classifier...</p>
    <template v-else>
      <div class="toolbar">
        <p class="summary" data-testid="species-summary">{{ summary }}</p>
        <div class="labelInputArea">
          <ToolTip :info="'if checked the species that have no flowers are left out of the map.'" />
          <label for="species-hide-empty">Hide empty species: </label>
          <input id="species-hide-empty" v-model="data.hideEmpty" type="checkbox" data-testid="species-hide-empty">
        </div>
        <div class="actions">
          <button type="button" class="safe-button" data-testid="species-finetune" @click="fineTune.open()"> Fine-tune... </button>
          <button v-if="SpeciesStore.hasTuned" type="button" class="unsafe-button" :disabled="!canReset" data-testid="species-reset" @click="askReset()">
            Use the built-in classifier
          </button>
        </div>
      </div>
      <FineTuneModal ref="fineTune" />
      <p v-if="SpeciesStore.status === 'classifying'" class="message" data-testid="species-progress">
        Classifying your flowers: {{ SpeciesStore.progress.done }} of {{ SpeciesStore.progress.total }}
      </p>
      <SpeciesMap
        :model="SpeciesStore.model" :counts="SpeciesStore.summary.counts" :selected="SpeciesStore.selected"
        :hide-empty="data.hideEmpty" @select="SpeciesStore.select($event)"
      />
      <SplitModal ref="splitModal" />
      <SpeciesDetail
        v-if="SpeciesStore.selected !== null" :model="SpeciesStore.model" :counts="SpeciesStore.summary.counts"
        :selected="SpeciesStore.selected" :is-split="data.sub !== null" @select="SpeciesStore.select($event)"
        @use-as-parent="useAsParent()" @split="splitModal.open(SpeciesStore.selected)" @unsplit="askUnsplit()"
      />
      <SubspeciesMap
        v-if="SpeciesStore.selected !== null && data.sub !== null" :model="data.sub.model" :counts="data.sub.counts"
        :selected="SpeciesStore.selectedSub" :name="SpeciesStore.nameOf(SpeciesStore.selected.x, SpeciesStore.selected.y)"
        @select="SpeciesStore.selectSub($event)"
      />
      <p v-if="parents.length > 0" class="parents" data-testid="species-parents">{{ parents.join(', ') }}</p>
      <p v-else class="message" data-testid="species-hint">Your flowers are sorted into species here, make some flowers to see them.</p>
      <div data-testid="species-flowers">
        <PaginationOrInfiniteScroll
          :pagination="isPaginated" :items-length="state.items.length"
          :current-page="state.page" :total-pages="state.totalPages"
          @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch"
        >
          <FlowersTable v-if="SpeciesStore.selected !== null" :flowers="state.items" :is-local="true" :no-flower-message="'There are no flowers of this species'" />
        </PaginationOrInfiniteScroll>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * The species of the local flowers: the map of the classifier with how many flowers each species
 * has, one species in detail, and its flowers.
 *
 * The flowers are classified when they are made and when they are shown. The ones that are not
 * classified yet are done when this tab opens, so the counts get complete.
 */
import { computed, inject, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import FlowersTable from '../components/FlowersTable.vue';
import ToolTip from '../components/ToolTip.vue';
import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
import SpeciesMap from '../components/species/SpeciesMap.vue';
import SpeciesDetail from '../components/species/SpeciesDetail.vue';
import FineTuneModal from '../components/species/FineTuneModal.vue';
import SplitModal from '../components/species/SplitModal.vue';
import SubspeciesMap from '../components/species/SubspeciesMap.vue';
import { usePaginatedList } from '../composables/usePaginatedList';
import { useClassifierReset } from '../composables/useClassifierReset';
import { useFlowerStore } from '../stores/FlowerStore';
import { useSpeciesStore } from '../stores/SpeciesStore';
import { useErrorStore } from '../stores/ErrorStore';
import * as speciesRepository from '../services/speciesRepository';
import * as flowerRepository from '../services/flowerRepository';

const routes = useRoute();
const FlowerStore = useFlowerStore();
const SpeciesStore = useSpeciesStore();
const ErrorStore = useErrorStore();
const { canReset, askReset } = useClassifierReset();
const fineTune = ref(null);
const splitModal = ref(null);
const emitter = inject('emitter');

const data = reactive({
    hideEmpty: false,
    failed: false,
    // the sub-species of the selected species, { model, counts, subfp }, null when it is not split
    sub: null,
    // what the species that is selected has to say is not asked for before the first list is here
    mounted: false
});

const cell = () => {
    const where = { x: SpeciesStore.selected.x, y: SpeciesStore.selected.y, fp: SpeciesStore.fp };
    const submap = SpeciesStore.submapOf(where.x, where.y);
    if(SpeciesStore.selectedSub !== null && submap !== undefined){
        where.sub = { x: SpeciesStore.selectedSub.x, y: SpeciesStore.selectedSub.y, fp: submap.subfp };
    }
    return where;
};
const { state, isPaginated, init, nextPage, prevPage, nextBatch } = usePaginatedList({
    fetchCount: async () => SpeciesStore.selected === null ? 0 : speciesRepository.countByCell(cell()),
    fetchPage: async ({ limit, offset }) => {
        if(SpeciesStore.selected === null){
            return [];
        }
        const ids = await speciesRepository.listFlowerIdsByCell({ ...cell(), limit, offset });
        const flowers = await flowerRepository.bulkGetFlowers(ids);
        return flowers.filter((flower) => flower !== undefined);
    }
});

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const summary = computed(() => {
    const { classified, atypical, counts } = SpeciesStore.summary;
    const species = SpeciesStore.model.width * SpeciesStore.model.height;
    const text = `${plural(classified, 'flower', 'flowers')} in ${counts.size} of ${plural(species, 'species', 'species')}`;
    return atypical > 0 ? `${text}, ${atypical} atypical` : text;
});

// "Parent 1: #12 (Spiral Iris (2, 3))", the flowers selected to reproduce, in the order they were chosen
const parents = computed(() => {
    return FlowerStore.localSelected.flowers.map((id, i) => {
        const row = SpeciesStore.rowFor(id);
        const sub = row ? SpeciesStore.subLabelFor(row) : '';
        const species = row ? ` (${SpeciesStore.nameOf(row.x, row.y)} (${row.x}, ${row.y})${sub === '' ? '' : ' / ' + sub})` : '';
        return `Parent ${i + 1}: #${id}${species}`;
    });
});

// A random flower of the species is the next parent, the same as clicking on one of its cards.
// The flower may not be on the page, so its species is read for the line of the parents.
const useAsParent = async () => {
    try{
        const id = await SpeciesStore.randomFlowerIn(SpeciesStore.selected, Math.random, SpeciesStore.selectedSub);
        if(id === null){
            return;
        }
        FlowerStore.selectLocalFlower({ id });
        await SpeciesStore.ensureFor([id]);
    }catch(e){
        ErrorStore.push(e);
    }
};

// What is shown of the sub-species of the selected species. The answer of a species that is not selected
// anymore is dropped.
const readSub = async () => {
    const selected = SpeciesStore.selected;
    let sub = null;
    try{
        sub = selected === null ? null : (await SpeciesStore.readSubspecies(selected)) ?? null;
    }catch(e){
        ErrorStore.push(e);
    }
    if(selected === SpeciesStore.selected){
        data.sub = sub;
    }
};

const askUnsplit = () => {
    const selected = SpeciesStore.selected;
    emitter.emit('showYesNo', {
        title: 'remove the sub-species',
        message: `Remove the sub-species of ${SpeciesStore.nameOf(selected.x, selected.y)}? The flowers stay in the species.`,
        btnNo: 'no',
        btnYes: 'Remove them',
        onConfirm: async () => {
            if(await SpeciesStore.unsplit(selected) === 'busy'){
                ErrorStore.push(new Error('Your flowers are still being classified, try again in a moment.'));
            }
        },
    });
};

// the species with most flowers, the one nearest the top left when they have as many
const selectBusiest = () => {
    let best = null;
    for(const [key, count] of SpeciesStore.summary.counts){
        const [x, y] = key.split(',').map(Number);
        if(best === null || count > best.count || (count === best.count && (y < best.y || (y === best.y && x < best.x)))){
            best = { x, y, count };
        }
    }
    if(best !== null){
        SpeciesStore.select({ x: best.x, y: best.y });
    }
};

onMounted(async () => {
    try{
        await SpeciesStore.start();
        await SpeciesStore.refreshSummary();
    }catch(e){
        data.failed = true;
        ErrorStore.push(e);
        return;
    }
    if(SpeciesStore.selected === null){
        selectBusiest();
    }
    await init(parseInt(routes.query.page, 10) || 0);
    data.mounted = true;
    SpeciesStore.classifyStale();
    placeInSub();
});

// The flowers made after the split are placed when the species is opened, and then shown.
const placeInSub = async () => {
    await readSub();
    if(SpeciesStore.selected !== null && data.sub !== null){
        await SpeciesStore.ensureSub(SpeciesStore.selected);
        await readSub();
    }
};

watch(() => SpeciesStore.selected, () => {
    data.sub = null;
    if(data.mounted){
        init();
        placeInSub();
    }
});
// the flowers of the sub-species, or all of the species again
watch(() => SpeciesStore.selectedSub, () => {
    if(data.mounted){
        init();
    }
});
// split, or not split anymore
watch(() => SpeciesStore.submaps, () => {
    if(data.mounted){
        readSub();
    }
});
// The classifier in use was replaced (fine-tuned, or the built-in one is back): what was selected is
// another species now, and the counts and the flowers are the ones of the new one.
watch(() => SpeciesStore.generation, () => {
    if(!data.mounted){
        return;
    }
    SpeciesStore.select(null);
    selectBusiest();
    if(SpeciesStore.selected === null){
        init();
    }
    readSub();
});
// the flowers that were classified while this was open are in the list when it is done
watch(() => SpeciesStore.status, (now, before) => {
    if(!data.mounted || before !== 'classifying' || now !== 'idle'){
        return;
    }
    if(SpeciesStore.selected === null){
        selectBusiest();
    }else{
        init(state.page);
        readSub();
    }
});
</script>

<style scoped>
    .Species{
        background-color: rgb(37, 39, 41);
        color: lightgreen;
    }
    .toolbar{
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 0.6rem;
        padding: 0.6rem 1.2rem 0 1.2rem;
    }
    .summary{
        margin: 0;
    }
    /* the same as the options of Settings: tooltip, label, and the check in a green box */
    .labelInputArea label{
        display: inline-block;
        margin: 0rem 0.4rem 0rem 0.93rem;
    }
    .labelInputArea input[type=checkbox]{
        background-color: green;
        color: lightgreen;
        border: solid lightgreen;
        cursor: pointer;
        display: inline-grid;
        place-content: center;
        grid-template-columns: 0.5em auto;
        gap: 0.1em;
        font-size: 2rem;
        font-weight: bold;
        vertical-align: middle;
        -webkit-appearance: none;
        appearance: none;
        box-shadow: inset 0rem 0rem 0.2rem 0.125rem black;
    }
    .labelInputArea input[type="checkbox"]::before{
        content: "";
        width: 0.65em;
        height: 0.65em;
        transform: scale(0);
        transition: 120ms transform cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: inset 2em 2em lightgreen;
        transform-origin: top left;
        clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
    }
    .labelInputArea input[type="checkbox"]:checked::before{
        transform: scale(1);
    }
    .actions{
        display: flex;
        gap: 0.6rem;
    }
    .safe-button, .unsafe-button{
        font-size: 0.9rem;
        border-radius: 1.2rem;
        cursor: pointer;
    }
    .safe-button{
        border: 0.1rem solid lightgreen;
        background-color: green;
        color: lightgreen;
    }
    .safe-button:hover{
        background-color: lightgreen;
        border-color: green;
        color: green;
    }
    .unsafe-button{
        border: 0.1rem solid red;
        background-color: darkred;
        color: white;
    }
    .unsafe-button:hover:not(:disabled){
        background-color: red;
    }
    .unsafe-button:disabled{
        opacity: 0.5;
        cursor: not-allowed;
    }
    .parents{
        margin: 0;
        padding: 0.4rem 1.2rem 0 1.2rem;
    }
    .message{
        margin: 0;
        padding: 0.8rem 1.2rem;
        text-align: center;
        font-size: 1.1rem;
    }
</style>
