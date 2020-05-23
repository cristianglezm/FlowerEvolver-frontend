<template>
    <div class="Flower">
        <img :src="'http://localhost:5000/generated/' + image" :alt="id"/>
        <h3>id: {{id}}</h3>
        <button @click="clicked = !clicked">Show Actions</button>
        <div v-if="clicked">
            <button @click="getGenome">download Genome</button><br/>
            <button @click="mutate">Mutate</button><br/>
            <button @click="reproduce">Mark for reproduction</button><br/>
            <button @click="toogleFavourite({id:id, genome:genome,image:image})">Heart</button><br/>
            <button @click="downloadImage">Download Image</button>
        </div>
    </div>
</template>

<script>
    import { mapActions } from 'vuex'
    export default {
        name:'Flower',
        props:{
            id: Number,
            genome: String,
            image: String,
        },
        data(){
            return{
                clicked: false,
            }
        },
        methods:{
            ...mapActions([
              'addFlowerToFav',
              'removeFlowerFromFav',
            ]),
            isFavourited: function(flower){
                return this.$store.state.favourites.some(fav => JSON.stringify(flower) === JSON.stringify(fav));
            },
            toogleFavourite: function(flower){
                if(this.isFavourited(flower)){
                    this.removeFlowerFromFav(flower);
                }else{
                    this.addFlowerToFav(flower);
                }
            },
            getGenome: function(){
                window.location = this.$settings.DOWNLOAD_URL + this.genome;
                //window.location = this.$parent.$parent.DOWNLOAD_URL + this.genome
            },
            mutate: function(){
                alert("sending data to mutate and update last flower")
            },
            reproduce: function(){
                /// store with vuex this flower id
            },
            downloadImage: function(){
                window.location = "http://localhost:5000/download/" + this.image
            },
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    h3{
        margin: 40px 0 0;
    }
    .Flower{
        background-color: gray;
    }
    border-bottom border-top border-left border-right{
        color: black;
    }
    button{
        color: black;
        background-color: lightgreen;
    }
    button:hover{
        background-color: green;
    }
</style>
