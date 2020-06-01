<template>
    <div class="Downloads">
        <div class="blocks">
            <div id="windows">
                Windows
                <button><a href="/FlowerEvolver_win32.zip">download</a></button>
            </div>
            <div id="linux">
                Linux
                <button><a>Coming soon!</a></button>
            </div>
        </div>
        <img id="image" src="/FlowerEvolverNative.png"/>
    </div>
</template>

<script>
    export default {
        name:'Downloads',
        props:{
            
        },
    }
</script>

<style scoped>
    .Downloads{
        display: grid;
        background-color: rgb(37, 39, 41);
    }
    .blocks{
        margin: 50px 50px 50px 50px;
        display: grid;
        grid-template-columns: auto auto;
        grid-gap: 10px;
        background-color: grey;
        font-size: 60px;
    }
    #image{
        width:100%;
    }
    .blocks button, a{
        text-decoration: none;
        text-indent: 10px;
        font-size: 60px;
        padding: 2px 10px 0px 0px;
        margin: 10px 0px 0px 0px;
        color: lightgreen;
        border-radius: 12px 12px 12px 12px;
        border: solid solid solid solid;
        border-color: lightgreen;
        background-color: green;
    }
    #linux{
    }
</style>