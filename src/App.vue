<template>
  <div id="app-container">
    <AppTitle />
    <AppMenu :is-local="isLocal()" />
    <router-view :key="routes.fullPath" class="view" />
    <AppFooter />
    <ProgressModal :id="'progressBar'" :channel="emitter" :on="'showProgress'" :update="'updateProgress'" />
    <MultiProgressNodal :id="'multiProgressBar'" :channel="emitter" :on="'requestMultiProgressBar'" />
    <DescriptionModal :id="'descriptionModal'" :channel="emitter" :on="'showDescriptionModal'" :update="'updateDesc'" />
  </div>
</template>

<script setup>

import { onMounted, inject } from 'vue';
import ProgressModal from './components/ProgressModal.vue';
import MultiProgressNodal from './components/MultiProgressModal.vue';
import DescriptionModal from './components/DescriptionModal.vue';
import AppTitle from './components/AppTitle.vue';
import AppMenu from './components/AppMenu.vue';
import AppFooter from './components/AppFooter.vue';
import { useRoute } from 'vue-router';
import { Captioner } from './store/AIStore/AI';
import { useFlowersStore } from './store';
import { useAIStore } from './store/AIStore';

const routes = useRoute();
const emitter = inject('emitter');
const store = useFlowersStore();
const AIStore = useAIStore();

emitter.on('loadModel', () => {
  setTimeout(() => {
      emitter.emit('requestMultiProgressBar', {
            status: "setup",
            title: "downloading or loading model for describing flowers",
            onLoad: async () => {
              Captioner.setModelOptions(AIStore.modelOptions);
              Captioner.getInstance((data) => {
                  switch(data.status){
                    case "initiate":{
                        let event = {
                          status: "init",
                          name: data.file,
                          progress: 0,
                          total: 100
                        };
                        emitter.emit('requestMultiProgressBar', event);
                    }
                      break;
                    case "progress":{
                        let event = {
                          status: "update",
                          name: data.file,
                          progress: data.progress
                        };
                        emitter.emit('requestMultiProgressBar', event);
                    }
                      break;
                    case "done":{
                      emitter.emit('ModelOptions#updateBtnTitle', {
                        title: "load model"
                      });
                    }
                  }
              });
            }
      });
    }, 2000);
});

const isLocal = () => {
  return routes.path === '/Local' || 
          routes.path === '/Favourites' || 
          routes.params.isLocal === 'local' || 
          routes.path === '/Settings';
};
onMounted(() => {
  if(store.settings.loadModel){
    emitter.emit('loadModel');
  }
})

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
  scrollbar-color: rgb(28, 30, 31) rgb(47, 50, 52);
}
</style>
