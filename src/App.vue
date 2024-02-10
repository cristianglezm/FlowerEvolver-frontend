<template>
  <div id="app-container">
    <AppHeader :is-local="isLocal()" />
    <router-view :key="routes.fullPath" class="view" />
    <AppFooter />
  </div>
</template>

<script setup>

import AppHeader from './components/AppHeader.vue';
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