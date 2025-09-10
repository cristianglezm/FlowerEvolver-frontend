<template>
  <div class="remote-options-container settings-box">
    <span>
      <h1 style="text-align: center;">Remote Options</h1>
    </span>
    <div class="labelInputArea">
      <ToolTip :info="'the backend url for the tts server (compatible with remsky/Kokoro-FastAPI)'" />
      <label for="tts-url">URL: </label>
      <input id="tts-url" v-model="data.remoteOptions.url" type="text" @change="saveRemoteOptions">
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'api key to access the backend if needed (it will be saved to localStorage)'" />
      <label for="apiKey">API Key: </label>
      <input id="apiKey" v-model="data.remoteOptions.api_key" :placeholder="data.remoteOptions.api_key" type="text" @change="saveRemoteOptions">
    </div>
    <div class="labelInputArea">
      <ToolTip :info="'model to use'" />
      <label for="model">Model: </label>
      <input id="model" v-model="data.remoteOptions.model" type="text" @change="saveRemoteOptions">
    </div>
    <details style="margin: 10px;">
      <summary class="bubble-btn">Advanced Options</summary>
      <div class="option-box labelInputArea">
        <ToolTip :info="'select which voice the model will use to generate the audio.'" />
        <label for="kokoro-voice-select"> Voice: </label>
        <select id="kokoro-voice-select" v-model="data.remoteOptions.voice" class="styled-select" name="voice-type" @change="saveRemoteOptions">
          <option v-for="v in voices" :key="v" :value="v">
            {{ v }}
          </option>
        </select>
      </div>
    </details>
  </div>
</template>

<script setup>
  import { reactive } from 'vue';
  import { useKokoroStore } from '../stores/KokoroStore';
  import ToolTip from './ToolTip.vue';

  const voices = [
        'af_heart',
        'af_alloy',
        'af_aoede',
        'af_bella',
        'af_nicole',
        'af_jessica',
        'af_kore',
        'af_nicole',
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
  const KokoroStore = useKokoroStore();
  const data = reactive({
      remoteOptions: KokoroStore.remoteOptions
  });
  const saveRemoteOptions = () => {
      KokoroStore.saveRemoteOptions();
  };
</script>

<style scoped>
  .remote-options-container{
      margin-top: 0.9em;
  }
  .bubble-btn{
      font-size: x-large;
      border: solid 1px lightgreen;
      border-radius: 25px;
      padding: 2px 5px 2px 5px;
      box-shadow: inset 1px 1px 10px 2px lightgreen;
      cursor: pointer;
      margin-bottom: 20px;
      margin-top: 20px;
  }
  .bubble-btn:hover{
      background-color: lightgreen;
      color: green;
      border: solid 1px green;
      box-shadow: inset 1px 1px 10px 2px black;
  }
  .bubble-btn:disabled{
      opacity: 0.5;
      cursor: not-allowed !important;
  }
  .labelInputArea{
      display: block;
      padding-top: 0.31rem;
  }
  .labelInputArea label{
      width: 8.3rem;
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
  .settings-box {
      border: 0.25rem solid lightgreen;
      padding: 0.6rem;
      margin-bottom: 1.25rem;
      border-radius: 2rem;
  }
  .settings-box h2{
      text-align: center;
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
  @media only screen and (max-width: 1280px){
      .labelInputArea label{
          width: 9.6rem;
          display: inline-block;
          margin: 0rem 0rem 0rem 0.93rem;
      }
      .labelInputArea input[type=text]{
          width: 48%;
          font-size: 0.9rem;
      }
      .labelInputArea input[type=number]{
          width: 20%;
      }
      .styled-select{
          padding: 0.2rem;
          font-size: 0.9rem;
      }
  }
  @media only screen and (max-width: 448px){
      .labelInputArea label{
          width: 6.8rem;
          display: inline-block;
          margin: 0rem 0rem 0rem 0.93rem;
      }
      .labelInputArea input[type=text]{
          width: 38%;
          font-size: 0.9rem;
      }
      .labelInputArea input[type=number]{
          width: 15%;
      }
  }
  .labelInputArea input[type=number] {
      appearance: textfield;
      box-shadow: inset 0rem 0rem 0.3rem 0.125rem black;
  }

</style>
