<template>
  <div id="app-container">
    <Header :isLocal="isLocal()"/>
    <router-view :key="$route.fullPath" class="view"></router-view>
    <Footer />
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import Header from './components/Header.vue';
import Footer from './components/Footer.vue';

export default defineComponent({
  name: 'App',
  components: {
    Header,
    Footer,
  },
  methods:{
    isLocal(){
      return this.$route.path === '/Demo' || 
              this.$route.path === '/Favourites' || 
              this.$route.params.isLocal === 'local';
    }
  },
});
</script>

<style>
@font-face {
  font-family: 'MonaspaceRadon-Regular';
  src: url('MonaspaceRadon-Regular.otf') format('opentype');
  font-weight: normal;
  font-style: normal;
}
html {
  font-family: 'MonaspaceRadon-Regular', Arial, Helvetica, sans-serif;
  background-color: green !important;
  scrollbar-color: rgb(28, 30, 31) rgb(47, 50, 52);
}
</style>