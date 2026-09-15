<template>
  <div class="remote-options-container settings-box">
    <span>
      <h1 style="text-align: center;">Remote Options</h1>
    </span>
    <div class="labelInputArea">
      <ToolTip :info="'the backend url for the llm server(llama.cpp, openAI, huggingface)'" />
      <label for="llm-url">URL: </label>
      <input id="llm-url" v-model="data.remoteOptions.url" type="text" @change="saveRemoteOptions">
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
      <div class="labelInputArea">
        <ToolTip :info="'Limits the maximum number of tokens generated in one response.'" />
        <label for="max-tokens">max tokens: </label>
        <input id="max-tokens" v-model="data.remoteOptions.max_tokens" type="number" @change="saveRemoteOptions">
      </div>
      <div class="labelInputArea">
        <ToolTip :info="'Controls randomness. Higher values (e.g., 1.0) are more random; lower values (e.g., 0.2) are more deterministic.'" />
        <label for="temperature">temperature: </label>
        <input id="temperature" v-model="data.remoteOptions.temperature" type="number" @change="saveRemoteOptions">
      </div>
      <div class="labelInputArea">
        <ToolTip :info="'Selects the next word from the top K most probable choices'" />
        <label for="top_k"> top k: </label>
        <input id="top_k" v-model="data.remoteOptions.top_k" type="number" @change="saveRemoteOptions">
      </div>
      <div class="labelInputArea">
        <ToolTip :info="'Filters out tokens with probabilities below this threshold'" />
        <label for="min_p">min p: </label>
        <input id="min_p" v-model="data.remoteOptions.min_p" type="number" @change="saveRemoteOptions">
      </div>
      <div class="labelInputArea">
        <ToolTip :info="'Considers tokens until their cumulative probability exceeds P.'" />
        <label for="top_p">top p: </label>
        <input id="top_p" v-model="data.remoteOptions.top_p" type="number" @change="saveRemoteOptions">
      </div>
    </details>
  </div>
</template>

<script setup>
  import { reactive } from 'vue';
  import { useChatBotStore } from '../stores/ChatBotStore';
  import ToolTip from './ToolTip.vue';

  const ChatBotStore = useChatBotStore();
  const data = reactive({
      remoteOptions: ChatBotStore.remoteOptions
  });
  const saveRemoteOptions = () => {
      ChatBotStore.saveRemoteOptions();
  };
</script>

<style scoped>
  .remote-options-container{
    margin-top: 0.9em;
    background-color: green;
    color: lightgreen;
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
  }
  @media only screen and (max-width: 448px){
      .labelInputArea label{
          width: 7.5rem;
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
