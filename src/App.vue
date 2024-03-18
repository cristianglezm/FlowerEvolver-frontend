<template>
  <div id="app-container">
    <AppTitle />
    <AppMenu :is-local="isLocal()" />
    <router-view :key="routes.fullPath" class="view" />
    <AppFooter />
  </div>
</template>

<script setup>

import AppTitle from './components/AppTitle.vue';
import AppMenu from './components/AppMenu.vue';
import AppFooter from './components/AppFooter.vue';
import { useRoute } from 'vue-router';

const routes = useRoute();

const isLocal = () => {
  return routes.path === '/Local' || 
          routes.path === '/Favourites' || 
          routes.params.isLocal === 'local' || 
          routes.path === '/Settings';
};

</script>

<style>
@font-face {
  /* 
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