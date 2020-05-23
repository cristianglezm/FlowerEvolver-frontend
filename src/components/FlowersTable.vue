<template>
    <div class="grid" v-if="flowers && flowers.length">
        <div v-for="flower in flowers"  :key="flower.id">
            <Flower :id="flower.id" :genome="flower.genome" :image="flower.image" />
        </div>
    </div>
    <div v-else-if="errors && errors.length">
        <p class="erred" v-for="error of errors" :key="error">
        {{error.message}}
        </p>
    </div>
</template>

<script>
    import axios from 'axios';
    import Flower from './Flower.vue';
    export default{
        name:'FlowersTable',
        components:{
            Flower,
        },
        
        data(){
            return{
                flowers: [],
                errors: []
            }
        },
        async created(){
            try{
                const response = await axios.get('http://localhost:5000/api/flowers')
                this.flowers = response.data.flowers
            }catch (e){
                this.errors.push(e)
            }
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    .grid{
        display: grid;
        grid-template-columns: auto auto auto auto auto;
    }
</style>
