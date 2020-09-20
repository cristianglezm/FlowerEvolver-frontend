<template>
    <div class="Downloads">
        <div class="blocks">
            <div id="windows">
                Windows
                <button><a :href="this.base_url + 'FlowerEvolver_win64.zip'">download x64</a></button>
            </div>
            <div id="linux">
                Linux
                <button><a :href="this.base_url + 'FlowerEvolver-x32-linux.tar'">download x32</a></button>
                <button><a :href="this.base_url + 'FlowerEvolver-x64-linux.tar'">download x64</a></button>
            </div>
        </div>
        <img id="image" :src="this.base_url + 'FlowerEvolverNative.png'"/>
    </div>
</template>

<script>
    export default {
        name:'Downloads',
        data(){
            return {
                base_url: process.env.BASE_URL,
            }
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
        background-color: green;
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
        border-radius: 315px 335px 155px 135px;
        border-color: lightgreen;
        background-color: green;
    }
    .blocks button:hover, a:hover{
        color: green;
        background-color: lightgreen;
        border-color: green;
    }
    @media only screen and (max-width: 740px){
        .blocks{
            margin: 30px 30px 30px 30px;
            display: grid;
            grid-template-columns: auto auto;
            grid-gap: 10px;
            background-color: green;
            font-size: 25px;
        }
        .blocks button, a{
            text-decoration: none;
            text-indent: 10px;
            font-size: 25px;
            padding: 2px 10px 0px 0px;
            margin: 10px 0px 0px 0px;
            color: lightgreen;
            border-radius: 12px 12px 12px 12px;
            border-color: lightgreen;
            background-color: green;
        }
    }
    #linux{
        color: lightgreen;
    }
    #windows{
        color: lightgreen;
    }
</style>
