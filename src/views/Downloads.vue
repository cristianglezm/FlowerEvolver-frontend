<template>
    <div class="Downloads">
        <div class="blocks">
            <div id="windows">
                Windows
                <button :href="this.base_url + 'FlowerEvolver_win64.zip'">download x64</button>
            </div>
            <div id="linux">
                Linux
                <button :href="this.base_url + 'FlowerEvolver-x32-linux.tar'">download x32</button>
                <button :href="this.base_url + 'FlowerEvolver-x64-linux.tar'">download x64</button>
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
        font-size: 60px;
        padding: 10px;
        border-radius: 12px;
    }
    #image{
        width:100%;
    }
    .blocks button{
        text-decoration: none;
        text-indent: 10px;
        font-size: 60px;
        padding: 2px 10px 0px 0px;
        margin: 10px 0px 0px 5px;
        color: lightgreen;
        border-radius: 315px 335px 155px 135px;
        border-color: lightgreen;
        background-color: green;
        cursor: pointer;
    }
    .blocks button:hover{
        color: green;
        background-color: lightgreen;
        border-color: green;
    }
    @media only screen and (max-width: 1280px){
        .blocks{
            margin: 30px 30px 30px 30px;
            display: grid;
            grid-template-columns: auto auto;
            grid-gap: 10px;
            background-color: green;
            font-size: 25px;
            padding: 10px;
            border-radius: 12px;
            cursor: pointer;
        }
        .blocks button{
            text-decoration: none;
            text-indent: 10px;
            font-size: 25px;
            padding: 2px 10px 0px 0px;
            margin: 10px 0px 0px 5px;
            color: lightgreen;
            border-radius: 12px 12px 12px 12px;
            border-color: lightgreen;
            background-color: green;
        }
    }
    #linux, #windows{
        color: lightgreen;
    }
</style>
