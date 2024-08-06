<template>
  <div id="app-container">
    <ProgressModal :id="'progressBar'" :channel="emitter" :on="'showProgress'" :update="'updateProgress'" />
    <DescriptionModal :id="'descriptionModal'" :channel="emitter" :on="'showDescriptionModal'" :update="'updateDesc'" />
    <AppTitle />
    <AppMenu :is-local="isLocal()" />
    <router-view :key="routes.fullPath" class="view" />
    <AppFooter />
  </div>
</template>

<script setup>

import { onMounted, inject } from 'vue';
import ProgressModal from './components/ProgressModal.vue';
import DescriptionModal from './components/DescriptionModal.vue';
import AppTitle from './components/AppTitle.vue';
import AppMenu from './components/AppMenu.vue';
import AppFooter from './components/AppFooter.vue';
import { useRoute } from 'vue-router';
import { Captioner } from './store/AIStore/AI';
import { useFlowersStore } from './store';

const routes = useRoute();
const emitter = inject('emitter');
const store = useFlowersStore();

const isLocal = () => {
  return routes.path === '/Local' || 
          routes.path === '/Favourites' || 
          routes.params.isLocal === 'local' || 
          routes.path === '/Settings';
};
onMounted(() => {
  if(store.settings.loadModel){
    setTimeout(() => {
      let progress = 1;
      emitter.emit('showProgress', {
            title: "downloading or loading model for describing flowers",
            progress: 0,
            total: 100,
            onLoad: () => {
              Captioner.getInstance((data) => {
                switch(data.status){
                  case "ready":
                      progress = 100;
                    break;
                  default:
                      progress = 50;
                    break;
                }
                emitter.emit('updateProgress', {
                                progress: progress
                            });
              });
            }
        });
    }, 2000);
  }
})
</script>

<style>
@font-face {
  /**
            SIL Open Font License 1.1 - Copyright (c) 2023, GitHub
            https://github.com/githubnext/monaspace
            with Reserved Font Name "Monaspace", including subfamilies: "Argon", "Neon", "Xenon", "Radon", and "Krypton"
  */
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