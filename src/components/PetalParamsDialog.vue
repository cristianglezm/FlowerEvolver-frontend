<template>
  <ModalDialog
    ref="dialog" size="wide" :title="`Edit the params of flower ${props.id}`" closable data-testid="petal-editor"
    @dismiss="close()" @close="emit('close')"
  >
    <div class="pictures">
      <figure>
        <img :src="props.imageSrc" alt="the flower as it is" data-testid="petal-editor-now">
        <figcaption>Now</figcaption>
      </figure>
      <figure>
        <img
          v-if="drawn" :src="drawn.image" alt="the flower with the params" :class="{ stale }"
          data-testid="petal-editor-drawn"
        >
        <div v-else class="nothing" data-testid="petal-editor-nothing">
          Redraw to see it
        </div>
        <figcaption>{{ stale ? 'Redraw to update it' : 'With the params' }}</figcaption>
      </figure>
    </div>
    <div class="fields">
      <NumberField
        v-for="field in fields" :key="field.key" v-model="form[field.key]" :input-id="`edit-${field.id}`" :label="field.label"
        :min="field.min" :max="field.max" :tooltip="field.tooltip" :validate="validate[field.key]"
        @change="check()"
      />
    </div>
    <p v-if="saved !== null" class="saved" data-testid="petal-editor-saved">
      Saved as flower {{ saved }}, it is in Local.
    </p>
    <div class="actions">
      <SafeButton :disabled="busy" data-testid="petal-editor-redraw" @click="redraw()">
        Redraw
      </SafeButton>
      <SafeButton :disabled="busy || saved !== null" data-testid="petal-editor-save" @click="save()">
        Save as new flower
      </SafeButton>
      <SafeButton :disabled="busy" data-testid="petal-editor-reset" @click="reset()">
        Reset
      </SafeButton>
    </div>
  </ModalDialog>
</template>

<script setup>
/**
 * The editor of the params of a flower: the four values of its petals, the flower drawn with them, and a button to
 * keep it. What is kept is a new flower of the browser, the one that it comes from is not changed; it is not a child of
 * it, it has its dna. It is for a flower of the browser or of the server, it only needs its genome.
 *
 * It opens itself when it is shown and says `close` when it is closed: the one that has it shows it when it is wanted
 * (a card has no need of one until then). What the params are limited to is for the wasm to say: a field that is left
 * is given the value that the wasm kept, as in the creation params of the settings, and so is each redraw.
 *
 * @component PetalParamsDialog
 * @prop {Number} id - the id of the flower, for the title.
 * @prop {String} genome - the genome of the flower, as text.
 * @prop {Object} params - its params, what the fields start with and what Reset goes back to.
 * @prop {String} imageSrc - the image of the flower as it is.
 * @emits close - it was closed.
 */
import { ref, computed, watch, onMounted } from 'vue';
import ModalDialog from './ui/ModalDialog.vue';
import NumberField from './ui/NumberField.vue';
import SafeButton from './ui/SafeButton.vue';
import { useLocalFlowerStore } from '../stores/LocalFlowerStore';
import { useErrorStore } from '../stores/ErrorStore';
import { usePetalParams } from '../composables/usePetalParams';

const props = defineProps({
    id: {
        type: Number,
        required: true,
    },
    genome: {
        type: String,
        required: true,
    },
    params: {
        type: Object,
        required: true,
        validator: (value) => 'radius' in value && 'numLayers' in value && 'P' in value && 'bias' in value,
    },
    imageSrc: {
        type: String,
        required: true,
    },
});
const emit = defineEmits(['close']);

const LocalFlowerStore = useLocalFlowerStore();
const ErrorStore = useErrorStore();

const dialog = ref(null);
// the fields start with the params of the flower, and one that is left empty keeps the value that the flower has
const { params: form, fields, validate, check, reset: resetForm, snapshot, isSameAs } = usePetalParams(props.params);
// the flower drawn with the params of the last redraw, and the id of the flower that was kept
const drawn = ref(null);
const saved = ref(null);
const busy = ref(false);

// what is drawn is not what the fields say once they have changed
const stale = computed(() => drawn.value !== null && !isSameAs(drawn.value.params));

// a flower that was kept can be kept again once the params are not the ones that it has: not before, it would be the same
watch(form, () => {
    if(saved.value !== null && !isSameAs(drawn.value.params)){
        saved.value = null;
    }
});
const showKept = (params) => resetForm(params);
const redraw = async () => {
    busy.value = true;
    try{
        drawn.value = await LocalFlowerStore.drawFlowerWithParams(props.genome, snapshot());
        showKept(drawn.value.params);
        saved.value = null;
    }catch(_){
        ErrorStore.push("couldn't draw the flower with those params.");
    }finally{
        busy.value = false;
    }
};
const save = async () => {
    busy.value = true;
    try{
        const flower = await LocalFlowerStore.addFlowerWithParams(props.genome, snapshot());
        if(flower !== undefined){
            const kept = JSON.parse(flower.genome).Flower.petals;
            drawn.value = { genome: flower.genome, image: flower.image, params: kept };
            showKept(kept);
            saved.value = flower.id;
        }
    }finally{
        busy.value = false;
    }
};
const reset = () => {
    resetForm();
    drawn.value = null;
    saved.value = null;
};
const close = () => {
    dialog.value.close();
};

onMounted(() => {
    dialog.value.open();
});
</script>

<style scoped>
    .pictures{
        display: flex;
        flex-flow: row nowrap;
        justify-content: space-evenly;
        align-items: flex-start;
        margin: 0.6rem 1rem;
    }
    figure{
        margin: 0;
        width: 45%;
    }
    img, .nothing{
        width: 100%;
        aspect-ratio: 2 / 3;
        object-fit: contain;
    }
    .nothing{
        display: flex;
        align-items: center;
        justify-content: center;
        border: dashed var(--fe-lightgreen);
        font-size: 0.9rem;
    }
    .stale{
        opacity: 0.4;
    }
    figcaption{
        font-size: 0.9rem;
    }
    .fields{
        padding: 0 1rem;
        text-align: left;
        --fe-field-label-width: 9.6rem;
        --fe-field-control-width: 20%;
    }
    .saved{
        margin: 0.4rem 1rem;
        font-size: 0.9rem;
    }
    .actions{
        --fe-button-margin: 0 0.31rem 0.6rem 0.31rem;
    }
</style>
