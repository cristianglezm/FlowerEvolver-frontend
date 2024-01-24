<template>
    <div class="Downloads">
        <div class="blocks">
            <div id="windows">
                Windows
                <a :href="this.base_url + 'FlowerEvolver_win64.zip'">download x64</a>
            </div>
            <div id="linux">
                Linux
                <a :href="this.base_url + 'FlowerEvolver-x64-linux.tar'">download x64</a>
            </div>
        </div>
        <img id="image" :src="this.base_url + 'FlowerEvolverNative.png'"/>
    </div>
</template>

<script>
	import { defineComponent } from 'vue';
	
    export default defineComponent({
        name:'Downloads',
        data(){
            return {
                base_url: import.meta.env.BASE_URL,
            }
        },
    });
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
        font-size: 58px;
        padding: 10px;
        border-radius: 12px;
    }
    #image{
        width:100%;
    }
    .blocks a{
        border: outset lightgreen;
        text-align: center;
        text-decoration: none;
        text-indent: 10px;
        font-size: 58px;
        padding: 2px 10px 0px 0px;
        margin: 10px 0px 0px 5px;
        color: lightgreen;
        border-radius: 315px 335px 155px 135px;
        background-color: green;
        cursor: pointer;
    }
    .blocks a:hover{
        color: green;
        background-color: lightgreen;
        border: inset green;
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
        .blocks a{
            text-decoration: none;
            text-indent: 10px;
            font-size: 25px;
            padding: 2px 10px 0px 0px;
            margin: 10px 0px 0px 5px;
            color: lightgreen;
            border-radius: 12px 12px 12px 12px;
            border-color: lightgreen;
            background-color: green;
            display: inline flex;
        }
    }
    #linux, #windows{
        color: lightgreen;
    }
</style>
