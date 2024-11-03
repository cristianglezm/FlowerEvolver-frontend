<template>
  <div class="ModelOptions-container">
    <h2> Model Options</h2>
    <div id="host-option" class="option-box labelInputArea">
      <ToolTip :info="'Host from which to download the model'" />
      <label for="host-select"> Host: </label>
      <select id="host-select" v-model="data.modelOptions.host" class="styled-select" name="hosts" @change="onChange()">
        <option value="huggingface"> https://huggingface.co </option>
        <option value="localhost"> http://localhost </option>
      </select>
    </div>
    <div id="model-option" class="option-box labelInputArea">
      <ToolTip :info="'model to download'" />
      <label for="model-id"> Model: </label>
      <input id="model-id" v-model="data.modelOptions.model" type="text" :class="{'disabled': !isLocalHost}" :disabled="isLocalHost === false" placeholder="cristianglezm/ViT-GPT2-FlowerCaptioner-ONNX" @change="onChange()">
    </div>
    <div id="device-option" class="option-box labelInputArea">
      <ToolTip :info="'where to run the model'" />
      <label for="device"> Device: </label>
      <input id="device-cpu" v-model="data.modelOptions.device" type="radio" name="device" value="CPU" @change="onChange()"> CPU
      <input id="device-gpu" v-model="data.modelOptions.device" type="radio" name="device" :disabled="isGPUAvailable() === false" value="GPU" @change="onChange()"> GPU
    </div>
    <div id="model-encoder-type" class="option-box labelInputArea">
      <ToolTip :info="'select which quantification the encoder will have.'" />
      <label for="quant-select"> Encoder: </label>
      <select id="quant-select" v-model="data.modelOptions.encoder" class="styled-select" name="quants" @change="onChange()">
        <option v-for="val in quants" :key="val" :value="val">
          {{ val }}
        </option>
      </select>
    </div>
    <div id="model-decoder-type" class="option-box labelInputArea">
      <ToolTip :info="'select which quantification the decoder will have.'" />
      <label for="quant-select"> Decoder: </label>
      <select id="quant-select" v-model="data.modelOptions.decoder" class="styled-select" name="quants" @change="onChange()">
        <option v-for="val in quants" :key="val" :value="val">
          {{ val }}
        </option>
      </select>
    </div>
    <div style="text-align: center;">
      <button class="safe-button" :class="{ 'disabled': isModelLoaded() }" @click="loadModel"> {{ data.btnTitle }}</button>
    </div>
    <div v-if="data.openCache && isModelDownloaded()" style="text-align: center;">
      <CacheManager :cacheName="'transformers-cache'" @on-delete="reloadCache" />
      <button class="safe-button" @click="data.openCache = false"> Close </button>
    </div>
    <div v-else style="text-align: center;">
      <button class="safe-button" :class="{'disabled': !isModelDownloaded() }" :disabled="!isModelDownloaded()" @click="openCacheManager()"> Manage model cache </button>
    </div>
  </div>
</template>

<script setup>
  import { computed, inject, nextTick, onMounted, onUnmounted, reactive } from 'vue';
  import { Captioner, isGPUAvailable } from '../store/AIStore/AI'
  import { useAIStore } from '../store/AIStore';
  import { CacheManager as CM } from '../store/CacheManager';
  import CacheManager from './CacheManager.vue';
  import ToolTip from './ToolTip.vue';

  const emitter = inject('emitter');
  const AIStore = useAIStore();
  
  let data = reactive({
    modelOptions: AIStore.modelOptions,
    openCache: false,
    forceReload: false,
    btnTitle: "download / load model"
  });
  let cm = new CM("transformers-cache");
  const quants = ["fp32", "fp16", "q8", "int8", "uint8", "q4", "q4f16", "bnb4"];
  const isLocalHost = computed(() => {
    return data.modelOptions.host === 'localhost';
  });
  const reloadCache = () => {
    cm.isInitialized = false;
    cm.initCache();
  };
  const isModelLoaded = () => {
    return Captioner.hasModelLoaded() && !data.forceReload;
  };
  const isModelDownloaded = () => {
    return cm.size() > 0;
  };
  const loadModel = async () => {
    if(isModelLoaded()){
      return;
    }
    await Captioner.reset();
    emitter.emit("loadModel");
    data.forceReload = false;
  }
  const hasModelOptionsChanged = () => {
    return (Captioner.modelOptions.host === AIStore.modelOptions.host &&
              Captioner.modelOptions.model === AIStore.modelOptions.model &&
              Captioner.modelOptions.device === AIStore.modelOptions.device &&
              Captioner.modelOptions.encoder === AIStore.modelOptions.encoder &&
              Captioner.modelOptions.decoder === AIStore.modelOptions.decoder);
  };
  const onChange = () => {
    if(data.modelOptions.model === "" || data.modelOptions.host === "huggingface"){
      data.modelOptions.model = "cristianglezm/ViT-GPT2-FlowerCaptioner-ONNX";
    }
    if(hasModelOptionsChanged()){
      data.forceReload = true;
    }
    AIStore.saveModelOptions();
  };
  const openCacheManager = () => {
    if(isModelDownloaded()){
      data.openCache = true;
    }
  }
  onMounted(() => {
    setTimeout(() => {
      if(isModelDownloaded()){
        data.btnTitle = "Load model";
      }else{
        data.btnTitle = "Download model";
      }
    }, 500);
    emitter.on('ModelOptions#updateBtnTitle', (e) => {
      nextTick(() => {
        reloadCache();
        data.btnTitle = e.title;
      });
    });
    emitter.on('modelOptions#forceReload', () => {
      data.forceReload = true;
    });
  });
  onUnmounted(() => {
    
    emitter.off('ModelOptions#updateBtnTitle');
    emitter.off('modelOptions#forceReload');
  });
</script>

<style scoped>
  .ModelOptions-container h2{
    text-align: center;
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
  .option-box {
      margin-bottom: 0.6rem;
  }
  .labelInputArea {
      display: block;
      padding-top: 0.31rem;
  }
  .labelInputArea label{
      width: 10rem;
      display: inline-block;
      margin: 0rem 0rem 0rem 0.93rem;
  }
  .labelInputArea input[type=text]{
        vertical-align:top;
        background-color: green;
        color: lightgreen;
        border: solid lightgreen;
        border-radius: 8rem;
        margin: 0.125rem 0rem 0rem 0.125rem;
        text-align: center;
        box-shadow: inset 0rem 0rem 0.3rem 0.125rem black;
        width: 50%;
        font-size: 1.25rem;
    }
    .labelInputArea input[type=radio]{
        background-color: green;
        color:lightgreen;
        border: solid lightgreen;
        border-radius: 1.25rem;
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
    .labelInputArea input[type="radio"]::before{
        content: "";
        width: 0.60em;
        height: 0.65em;
        transform: scale(0);
        transition: 120ms transform cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: inset 2em 2em lightgreen;
        transform-origin: top left;
        clip-path: circle(9px);
    }
    .labelInputArea input[type="radio"]:checked::before{
        transform: scale(1);
    }
    .labelInputArea input[type="radio"]:disabled{
      opacity: 0.5;
      cursor: not-allowed;
    }
    .styled-select{
        background-color: green;
        color: lightgreen;
        border: solid lightgreen;
        padding: 0.5rem;
        font-size: 1.25rem;
        cursor: pointer;
        box-shadow: inset 0rem 0rem 0.3rem 0.125rem black;
        border-radius: 1.25rem;
        text-align: center;
    }
    .styled-select option:checked{
        background-color: green;
        color: lightgreen;
    }
    .styled-select option:hover{
      background-color: green;
      color:lightgreen;
      cursor: pointer;
    }
    .styled-select:hover{
        background-color: lightgreen;
        color: green;
    }
    .styled-select:focus{
        background-color: lightgreen;
        color: green;
        border-radius: 2.5em;
        cursor: pointer;
    }
    .styled-select::after{
        content: '▼';
        position: absolute;
        right: 0.625rem;
        pointer-events: none;
        transition: 0.2s ease;
    }
    .styled-select:focus-within::after {
      transform: rotateX(0.5turn) translateY(-2px);
    }
    .disabled{
      cursor: not-allowed;
      opacity: 0.5;
    }
    @media only screen and (max-width: 1280px){
      .safe-button{
          font-size: 0.9rem;
          margin: 0.6rem 0.6rem 0rem 1.25rem;
      }
      .labelInputArea label{
          width: 6rem;
          display: inline-block;
          margin: 0rem 0rem 0rem 0.93rem;
      }
      .labelInputArea input[type=text]{
          width: 50%;
          font-size: 0.9rem;
      }
      .labelInputArea input[type=radio]{
          font-size: 0.9rem;
      }
      .labelInputArea input[type="radio"]::before{
          clip-path: circle(2px);
      }
      .styled-select{
          padding: 0.5rem;
          font-size: 0.9rem;
      }
    }
</style>
