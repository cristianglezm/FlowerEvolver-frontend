<template>
    <div id="app">
        <Header />
        <router-view class="view"></router-view>
    </div>
</template>
<!-- 
TODO
    routes
        LastAdded -> last 25|50|100?
        Browse -> lazy loading
        Favourites -> limited to ?
        Download -> download native app
        Demo -> when backend is off show this [github]
    actions
        makeFlower
        reproduce
 -->
<script>
import Header from './components/Header.vue';


export default{
    name: 'App',
    components:{
        Header,
    },
    data(){
        return{
            DOWNLOAD_URL:"http://localhost:5000/download/",
        }
    }
}
</script>

<style>
    #app {
        font-family: Avenir, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: left;
        color: #2c3e50;
        margin-top: 60px;
    }
</style>
