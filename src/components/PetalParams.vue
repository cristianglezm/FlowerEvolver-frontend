<template>
  <div class="pIcon" data-testid="params-toggle" @click="toogle()">
    p
  </div>
  <div v-if="showing">
    <FloatingPanel :loc="'bottom'" :match-parent-width="false">
      <div class="PetalParams">
        <div style="display: flex; flex-flow: row nowrap;">
          <h2>Parameters</h2>
          <span class="close" @click="close()">&times;</span>
        </div>
        <p>Radius: {{ props.params.radius }}</p>
        <p>Number of layers: {{ props.params.numLayers }}</p>
        <p>P: {{ props.params.P.toFixed(2) }}</p>
        <p>Bias: {{ props.params.bias.toFixed(2) }}</p>
        <div class="actions">
          <SafeButton
            size="small" :disabled="!props.known" data-testid="params-use"
            :title="props.known ? 'the flowers that are made from now on will have these params' : 'the params of this flower are not known yet'"
            @click="use()"
          >
            Use for new flowers
          </SafeButton>
          <SafeButton
            size="small" :disabled="!props.known" data-testid="params-edit"
            :title="props.known ? 'change the params and draw the flower with them' : 'the params of this flower are not known yet'"
            @click="emit('edit')"
          >
            Edit
          </SafeButton>
        </div>
        <p v-if="used" class="used" data-testid="params-used">
          New flowers will have these params.
        </p>
      </div>
    </FloatingPanel>
  </div>
</template>

<script setup>
    import { ref } from 'vue';
    import FloatingPanel from './FloatingPanel.vue';
    import SafeButton from './ui/SafeButton.vue';

    const props = defineProps({
        // false while they are not the ones of the flower, a flower of the server whose genome is still coming
        known: {
            type: Boolean,
            default: true,
        },
        params: {
            type: Object,
            required: true,
            validator: (value) => {
                return 'radius' in value && 'numLayers' in value &&
                       'P' in value && 'bias' in value;
            }
        }
    });
    const emit = defineEmits(['use', 'edit']);
    let showing = ref(false);
    let used = ref(false);
    const toogle = () => {
        showing.value = !showing.value;
        used.value = false;
    };
    const close = () => {
        showing.value = false;
    };
    // what to do with them is for the one that has the flower
    const use = () => {
        emit('use', { ...props.params });
        used.value = true;
    };
</script>

<style scoped>
    .close{
        color: var(--fe-lightgreen);
        margin-right: 1%;
        font-size: 1.8rem;
        font-weight: bold;
        cursor: pointer;
        position: relative;
    }
    .pIcon{
        background-color: var(--fe-green);
        border: solid var(--fe-lightgreen);
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        width: 1.75rem;
        height: 1.75rem;
        cursor: pointer;
        color: var(--fe-lightgreen);
        font-weight: bold;
        user-select: none;
    }
    .PetalParams{
        color: var(--fe-lightgreen);
        background-color: var(--fe-green);
        border: solid var(--fe-lightgreen);
        border-radius: 1.25rem;
        padding: 0.6rem;
        overflow: auto;
        overflow-wrap: break-word;
    }
    .actions{
        --fe-button-margin: 0.6rem 0.3rem 0 0;
    }
    .used{
        margin-bottom: 0;
        font-size: 0.9rem;
    }
</style>
