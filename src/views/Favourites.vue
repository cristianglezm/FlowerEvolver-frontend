<template>
    <div class="grid" v-if="favourites && favourites.length">
        <div v-for="flower in favourites" :key="flower.id">
            <Flower :id="flower.id" :genome="flower.genome" :image="flower.image" :useUrl="true"/>
        </div>
    </div>
    <div v-else>
        <p style="color: lightgreen; font-size: large;">You don't Have Favourites, go to Browse or Last Added to add.</p>
    </div>
</template>

<script>
    import Flower from '../components/Flower.vue';
    export default{
        name:'Favourites',
        components:{
            Flower,
        },
        data(){
            return{
                favourites: this.$store.state.favourites,
            }
        },
        methods: {
            
        },
    }
</script>

<style scoped>
    .grid{
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        grid-gap: 10px;
        background-color: black;
    }
    @media only screen and (max-width: 740px){
        .grid{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            grid-gap: 10px;
            background-color: black;
        }
    }
</style>
