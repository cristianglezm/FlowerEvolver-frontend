<template>
  <div class="ModelOptions-container">
    <h2> Kokoro Model Options</h2>
    <div id="chatbot-host-option" class="option-box labelInputArea">
      <ToolTip :info="'Host from which to download the model'" />
      <label for="chatbot-host-select"> Host: </label>
      <select id="kokoro-host-select" v-model="data.modelOptions.host" class="styled-select" name="hosts" @change="onChange()">
        <option value="huggingface"> https://huggingface.co </option>
        <option value="localhost"> http://localhost </option>
      </select>
    </div>
    <div id="kokoro-model-option" class="option-box labelInputArea">
      <ToolTip :info="'model to download'" />
      <label for="kokoro-model-id"> Model: </label>
      <input id="kokoro-model-id" v-model="data.modelOptions.model" type="text" :class="{'disabled': !isLocalHost}" :disabled="isLocalHost === false" :placeholder="data.defaultModel" @change="onChange()">
    </div>
    <div id="kokoro-device-option" class="option-box labelInputArea">
      <ToolTip :info="'where to run the model'" />
      <label for="kokoro-device"> Device: </label>
      <input id="kokoro-device-cpu" v-model="data.modelOptions.device" type="radio" name="kokoro-device" value="CPU" @change="onChange()"> CPU
      <input id="kokoro-device-gpu" v-model="data.modelOptions.device" type="radio" name="kokoro-device" :disabled="isGPUAvailable() === false" value="GPU" @change="onChange()"> GPU
    </div>
    <div id="kokoro-model-dtype" class="option-box labelInputArea">
      <ToolTip :info="'select which quantification the model will have.'" />
      <label for="kokoro-quant-select-dtype"> DType: </label>
      <select id="kokoro-quant-select-dtype" v-model="data.modelOptions.dtype" class="styled-select" name="quants-dtype" @change="onChange()">
        <option v-for="val in quants" :key="val" :value="val">
          {{ val }}
        </option>
      </select>
    </div>
    <div id="kokoro-model-voice" class="option-box labelInputArea">
      <ToolTip :info="'select which voice the model will use to generate the audio.'" />
      <label for="kokoro-voice-select"> Voice: </label>
      <select id="kokoro-voice-select" v-model="data.modelOptions.voice" class="styled-select" name="voice-type" @change="onChange()">
        <option v-for="v in voices" :key="v" :value="v">
          {{ v }}
        </option>
      </select>
    </div>
    <div style="text-align: center;">
      <button class="safe-button" :class="{ 'disabled': isModelLoaded() }" @click="loadModel"> {{ data.btnTitle }}</button>
    </div>
    <div v-if="data.openCache && isModelDownloaded()" style="text-align: center;">
      <button class="safe-button" @click="toggleCacheManager()"> Close </button>
      <CacheManager :cacheName="data.cacheKey" @on-delete-host="reloadCache(); forceReload();" @on-delete-files="reloadCache()" />
    </div>
    <div v-else style="text-align: center;">
      <button class="safe-button" :class="{'disabled': !isModelDownloaded() }" :disabled="!isModelDownloaded()" @click="toggleCacheManager()"> Manage model cache </button>
    </div>
    <div v-if="data.openVoicesCache" style="text-align: center;">
      <button class="safe-button" @click="toggleVoicesCacheManager()"> Close </button>
      <CacheManager :cacheName="data.cacheKeyVoices" @on-delete-host="toggleVoicesCacheManager()" />
    </div>
    <div v-else style="text-align: center;">
      <button class="safe-button" :class="{'disabled': !isModelDownloaded() }" :disabled="!isModelDownloaded()" @click="toggleVoicesCacheManager()"> Manage voices cache </button>
    </div>
  </div>
</template>
  
  <script setup>
    import { computed, nextTick, onMounted, onUnmounted, reactive } from 'vue';
    import { Kokoro, isGPUAvailable, CACHE_KEY as KOKORO_CACHE_KEY, VOICES_CACHE_KEY } from '../stores/KokoroStore/Kokoro'
    import { useKokoroStore } from '../stores/KokoroStore';
    import { CacheManager as CM } from '../stores/CacheManager';
    import CacheManager from './CacheManager.vue';
    import ToolTip from './ToolTip.vue';

    const props = defineProps({
      emitter: {
        type: Object,
        required: true,
      }
    });
    const emitter = props.emitter;
    const KokoroStore = useKokoroStore();
    
    let data = reactive({
      modelOptions: KokoroStore.modelOptions,
      openCache: false,
      openVoicesCache: false,
      cacheKey: KOKORO_CACHE_KEY,
      cacheKeyVoices: VOICES_CACHE_KEY,
      forceReload: false,
      defaultModel: Kokoro.modelOptions.model,
      btnTitle: "download / load model"
    });
    let cm = new CM(data.cacheKey);
    const quants = ["fp32", "fp16", "q8", "int8", "uint8", "q4", "q4f16", "bnb4"];
    const voices = [
        'af_heart',
        'af_alloy',
        'af_aoede',
        'af_bella',
        'af_nicole',
        'af_jessica',
        'af_kore',
        'af_nova',
        'af_river',
        'af_sarah',
        'af_sky',
        'am_adam',
        'am_echo',
        'am_eric',
        'am_fenrir',
        'am_liam',
        'am_michael',
        'am_onyx',
        'am_puck',
        'am_santa',
        'bf_emma',
        'bf_isabella',
        'bm_george',
        'bm_lewis',
        'bf_alice',
        'bf_lily',
        'bm_daniel',
        'bm_fable',
    ];
    const isLocalHost = computed(() => {
      return data.modelOptions.host === 'localhost';
    });
    const reloadCache = () => {
      emitter.emit('AppOptions#recalcSpace');
      cm.reload();
    };
    const forceReload = () => {
      data.forceReload = true;
    };
    const isModelLoaded = () => {
      return KokoroStore.hasModelLoaded && !data.forceReload;
    };
    const isModelDownloaded = () => {
      return cm.size() > 0;
    };
    const isModelInCache = () => {
      let host = "https://huggingface.co";
      if(KokoroStore.modelOptions.host !== "huggingface"){
        host = "http://localhost";
      }
      const getQuantName = (quantType) => {
        ///@todo add conversions for missing types?
        switch(quantType){
          case "q8": return "_quantized";
          case "fp32": return "";
          default: return "_" + quantType;
        }
      };
      let dtype = "model" + getQuantName(KokoroStore.modelOptions.dtype) + ".onnx";
      return cm.hasFiles(host, ["config.json", "tokenizer_config.json", 
                          "tokenizer.json", "generation_config.json", dtype]);
    };
    const loadModel = async () => {
      if(isModelLoaded()){
        return;
      }
      emitter.emit("ChatBotWidget#loadKokoroModel");
      data.forceReload = false;
    }
    const hasModelOptionsChanged = () => {
      return KokoroStore.hasModelOptionsChanged;
    };
    const setCorrectBtnTitle = () => {
      if(isModelInCache()){
        data.btnTitle = "Load Model";
      }else{
        data.btnTitle = "Download Model";
      }
    };
    const onChange = () => {
      if(data.modelOptions.model === "" || data.modelOptions.host === "huggingface"){
        data.modelOptions.model = data.defaultModel;
      }
      if(hasModelOptionsChanged()){
        data.forceReload = true;
      }else{
        data.forceReload = false;
      }
      KokoroStore.saveModelOptions();
      setCorrectBtnTitle();
    };
    const toggleCacheManager = () => {
      if(isModelDownloaded()){
        data.openCache = !data.openCache;
      }
    };
    const toggleVoicesCacheManager = () => {
      data.openVoicesCache = !data.openVoicesCache;
    };
    onMounted(() => {
      KokoroStore.saveModelOptions();
      setTimeout(() => {
        if(isModelDownloaded()){
          data.btnTitle = "Load Model";
        }else{
          data.btnTitle = "Download Model";
        }
      }, 500);
      emitter.on('ChatBotModelOptions#updateBtnTitle', () => {
        nextTick(() => {
          reloadCache();
          setCorrectBtnTitle();
        });
      });
      emitter.on('modelOptions#forceReload', () => {
        data.forceReload = true;
      });
    });
    onUnmounted(() => {
      emitter.off('ChatBotModelOptions#updateBtnTitle');
      emitter.off('modelOptions#forceReload');
    });
  </script>
  
  <style scoped>
    .ModelOptions-container{
      background-color: green;
      border: solid lightgreen;
      border-radius: 2rem;
      margin: 1em 1em;
      padding: 1em 1em;
    }
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
      .styled-select::selection{
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
      .styled-select select::selection, .styled-select option:checked{
        background-color: green;
        color: lightgreen;
      }
      .styled-select option:hover{
        background-color: green;
        color:lightgreen;
        cursor: pointer;
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
            width: 5rem;
            display: inline-block;
            margin: 0rem 0rem 0rem 0.93rem;
        }
        .labelInputArea input[type=text]{
            width: 48%;
            font-size: 0.9rem;
        }
        .labelInputArea input[type=radio]{
            font-size: 0.9rem;
        }
        .labelInputArea input[type="radio"]::before{
            clip-path: circle(3px);
        }
        .styled-select{
            padding: 0.2rem;
            font-size: 0.9rem;
        }
        .labelInputArea select{
            width: 50%;
        }
      }
      @media only screen and (max-width: 448px){
        .ModelOptions-container{
          font-size: 0.75rem;
        }
        .labelInputArea label{
            width: 5rem;
            display: inline-block;
            margin: 0rem 0rem 0rem 0.93rem;
        }
        .labelInputArea input[type=text]{
            width: 48%;
            font-size: 0.9rem;
        }
        .labelInputArea select{
            width: 50%;
        }
      }
  </style>
