<template>
    <div class="grid" v-if="favourites && favourites.length">
        <div v-for="flower in favourites" :key="flower.id">
            <Flower :id="flower.id" :genome="flower.genome" :image="flower.image" />
        </div>
    </div>
    <div v-else>
        <p>You don't Have Favourites, go to Browse or Last Added to add.</p>
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
        computed: {
            //favourites: this.$store.state.favourites,
        },
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    .grid{
        display: grid;
        grid-template-columns: auto auto auto auto auto;
    }
</style>
