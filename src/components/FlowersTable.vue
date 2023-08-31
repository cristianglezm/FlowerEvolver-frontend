<template>
    <div class="grid" v-if="Flowers && Flowers.length">
        <div v-for="flower in Flowers"  :key="flower.id">
            <Flower :id="flower.id" :genome="flower.genome" :image="flower.image" :useUrl="useUrl"/>
        </div>
    </div>
    <div class="error" v-else>
        <p>{{noFlowerMessage}}</p>
    </div>
</template>

<script>
	import { defineComponent } from 'vue';
    import Flower from './Flower.vue';

    export default defineComponent({
        name:'FlowersTable',
        components:{
            Flower,
        },
        props:{
            Flowers: Array,
            useUrl: Boolean,
            noFlowerMessage: String,
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
    @media only screen and (max-width: 1280px){
        .grid{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            grid-gap: 10px;
            background-color: black;
        }
    }
    .error{
        color: lightgreen;
        font-size: 20px;
        text-align: center;
        padding-bottom: 10px;
    }
</style>
