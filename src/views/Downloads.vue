<template>
  <div class="Downloads">
    <div class="blocks">
      <div id="windows">
        Windows 11
        <a :href="data.base_url + 'FlowerEvolver_win64.zip'">download x64</a>
      </div>
      <div id="linux">
        Ubuntu 20.04
        <a :href="data.base_url + 'FlowerEvolver_x64_ubuntu_20.04.tgz'">download x64</a>
      </div>
    </div>
    <video id="fe-video" loading="lazy" controls="true" :src="data.base_url + 'FlowerEvolver-v1.mp4'" />
  </div>
</template>

<script setup>

	const data = {
        base_url: import.meta.env.BASE_URL
    };

</script>

<style scoped>
    .Downloads{
        display: grid;
        background-color: rgb(37, 39, 41);
    }
    .blocks{
        margin: 3.1rem 1.5rem 3.1rem 1.5rem;
        display: grid;
        grid-template-columns: auto auto;
        grid-gap: 0.6rem;
        font-size: 2.6rem;
        padding: 0.6rem;
        border-radius: 0.75rem;
    }
    #fe-video{
        width: 100%;
        position: relative;
    }
    .blocks a{
        border: outset lightgreen;
        text-align: center;
        text-decoration: none;
        text-indent: 0.6rem;
        font-size: 2.6rem;
        padding: 0.1rem 0.6rem 0rem 0rem;
        margin: 0.6rem 0rem 0rem 0.3rem;
        color: lightgreen;
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
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
            margin: 1.8rem 0.5rem 1.8rem 0.5rem;
            display: grid;
            grid-template-columns: auto auto;
            grid-gap: 0.6rem;
            background-color: green;
            font-size: 1.5rem;
            padding: 0.6rem;
            border-radius: 0.75rem;
            cursor: pointer;
        }
        .blocks a{
            text-decoration: none;
            text-indent: 0.6rem;
            font-size: 1.5rem;
            padding: 0.1rem 0.6rem 0rem 0rem;
            margin: 0.6rem 0rem 0rem 0.3rem;
            color: lightgreen;
            border-radius: 0.75rem 0.75rem 0.75rem 0.75rem;
            border-color: lightgreen;
            background-color: green;
            display: inline flex;
        }
    }
    #linux, #windows{
        color: lightgreen;
    }
</style>
