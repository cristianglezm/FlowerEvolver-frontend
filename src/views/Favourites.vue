<template>
    <div class="grid" v-if="favourites && favourites.length">
        <div v-for="flower in favourites" :key="flower.id">
            <Flower :id="flower.id" :genome="flower.genome" :image="flower.image" :useUrl="true"/>
        </div>
    </div>
    <div v-else>
        <p class="nofavs">You don't Have Favourites, go to Browse or Last Added to add.</p>
    </div>
</template>

<script>
	import { defineComponent } from 'vue';
    import Flower from '../components/Flower.vue';
	import { useFlowersStore } from '../store';

    export default defineComponent({
        name:'Favourites',
        components:{
            Flower,
        },
        data(){
            return{
                favourites: this.$store.favourites,
            }
        },
        methods: {
            
        },
    });
</script>

<style scoped>
    .grid{
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        grid-gap: 10px;
        background-color: black;
    }
    .nofavs{
        color: lightgreen;
        font-size: large;
        padding: 15px;
        background-color: rgb(37, 39, 41);
        margin: 0px;
    }
    @media only screen and (max-width: 1280px){
        .grid{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            grid-gap: 10px;
            background-color: black;
        }
    }
</style>
