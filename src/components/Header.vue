<template>
    <div class="Header">
        <header>
            <h1>Flower Evolver</h1>
        </header>
        <div class="tabs">
            <ul>
                <router-link to="LastAdded">Last Added</router-link>
                <router-link to="Browse">Browse</router-link>
                <router-link to="Favourites">Favourites</router-link>
                <router-link to="Downloads">Downloads</router-link>
            </ul>
        </div>
        <div class="repr">
            <ul>
                
            </ul>
        </div>
    </div>
</template>
<script>
    
    export default {
        name:'Header',
        props:{
            
        },
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    .tabs{
        background-color: green;
    }
</style>
