<template>
  <div id="app-container">
    <AppTitle />
    <AppMenu :is-local="isLocal()" />
    <router-view :key="routes.fullPath" class="view" />
    <AppFooter />
    <div v-show="isChatBotOpened">
      <ChatBotWidget :emitter="emitter" :chat-template="chat_template" :tools="tools" :docKeys="documentStore.keys()" :executor="execCommand" />
    </div>
    <ProgressModal :id="'progressBar'" :channel="emitter" :on="'showProgress'" :update="'updateProgress'" />
    <MultiProgressNodal :id="'multiProgressBar'" :channel="emitter" :on="'requestMultiProgressBar'" />
    <DescriptionModal :id="'descriptionModal'" :channel="emitter" :on="'showDescriptionModal'" :update="'updateDesc'" />
  </div>
</template>

<script setup>
import { onMounted, inject, onUnmounted, computed } from 'vue';
import ProgressModal from './components/ProgressModal.vue';
import MultiProgressNodal from './components/MultiProgressModal.vue';
import DescriptionModal from './components/DescriptionModal.vue';
import AppTitle from './components/AppTitle.vue';
import AppMenu from './components/AppMenu.vue';
import AppFooter from './components/AppFooter.vue';
import ChatBotWidget from './components/ChatBotWidget.vue';
import { useRoute } from 'vue-router';
import { useFlowerStore } from './stores/FlowerStore';
import { useCaptionerStore } from './stores/CaptionerStore';
import { useDocumentStore } from './stores/documentStore';
import { chat_template, tools, documents,  execCommand } from './stores/ChatBotConfig';

const routes = useRoute();
const emitter = inject('emitter');
const FlowerStore = useFlowerStore();
const CaptionerStore = useCaptionerStore();
const documentStore = useDocumentStore();

const isChatBotOpened = computed(() => {
  return FlowerStore.settings.showChatBot;
});
const isLocal = () => {
  return routes.path === '/Local' || 
          routes.path === '/Favourites' || 
          routes.params.isLocal === 'local' || 
          routes.path === '/Settings';
};
onMounted(() => {
  documentStore.map(documents);
  emitter.on('App#loadCaptionerModel', () => {
    setTimeout(() => {
        emitter.emit('requestMultiProgressBar', {
              status: "setup",
              title: "downloading or loading captioner model",
              onLoad: async () => {
                  CaptionerStore.requestModelLoad();
              }
        });
      }, 2000);
  });
  CaptionerStore.channel.on('App#ToEmitter', (e) => {
    emitter.emit(e.eventName, e.event);
  });
  if(FlowerStore.settings.loadCaptionerModel){
    emitter.emit('App#loadCaptionerModel');
  }
  if(FlowerStore.settings.loadChatBotModel){
    emitter.emit('ChatBotWidget#loadChatBotModel');
  }
});
onUnmounted(() => {
  CaptionerStore.channel.off('App#ToEmitter');
  emitter.off("App#loadCaptionerModel");
});

  /*!
   * @license SIL Open Font License 1.1 - Copyright (c) 2023, GitHub
   * https://github.com/githubnext/monaspace
   * with Reserved Font Name "Monaspace", including subfamilies: "Argon", "Neon", "Xenon", "Radon", and "Krypton"
   */
</script>
<style>
@font-face {
  font-family: 'MonaspaceRadon-Regular';
  src: url('/MonaspaceRadon-Regular.otf') format('opentype');
  font-weight: normal;
  font-style: normal;
}
html {
  font-family: 'MonaspaceRadon-Regular', Arial, Helvetica, sans-serif;
  background-color: green !important;
  scrollbar-color: lightgreen rgb(47, 50, 52);
  width: 100%;
  height: 100%;
  overflow-x: hidden;
}
</style>
