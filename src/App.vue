<template>
    <div id="app">
        <Header />
        <router-view :key="$route.fullPath" class="view"></router-view>
        <Footer />
    </div>
</template>

<script>
    import Header from './components/Header.vue';
    import Footer from './components/Footer.vue';
    export default{
        name: 'App',
        components:{
            Header,
            Footer,
        },
    }
</script>

<style>
    html{
        background-color: green !important;
        scrollbar-color: rgb(28, 30, 31) rgb(47, 50, 52);
    }
</style>