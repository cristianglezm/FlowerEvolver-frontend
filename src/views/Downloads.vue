<template>
  <div class="Downloads">
    <div class="blocks">
      <div id="windows">
        Windows 11
        <a :href="data.base_url + 'FlowerEvolver_win64.zip'">download x64</a>
      </div>
      <div id="linux">
        Ubuntu 22.04
        <a :href="data.base_url + 'FlowerEvolver_x64_ubuntu_22.04.tgz'">download x64</a>
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
        background-color: var(--fe-surface);
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
        border: outset var(--fe-lightgreen);
        text-align: center;
        text-decoration: none;
        text-indent: 0.6rem;
        font-size: 2.6rem;
        padding: 0.1rem 0.6rem 0rem 0rem;
        margin: 0.6rem 0rem 0rem 0.3rem;
        color: var(--fe-lightgreen);
        border-radius: 19.6rem 20.9rem 9.6rem 8.4rem;
        background-color: var(--fe-green);
        cursor: pointer;
    }
    .blocks a:hover{
        color: var(--fe-green);
        background-color: var(--fe-lightgreen);
        border: inset var(--fe-green);
    }
    @media only screen and (max-width: 1280px){
        .blocks{
            margin: 1.8rem 0.5rem 1.8rem 0.5rem;
            display: grid;
            grid-template-columns: auto auto;
            grid-gap: 0.6rem;
            background-color: var(--fe-green);
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
            color: var(--fe-lightgreen);
            border-radius: 0.75rem 0.75rem 0.75rem 0.75rem;
            border-color: var(--fe-lightgreen);
            background-color: var(--fe-green);
            display: inline flex;
        }
    }
    #linux, #windows{
        color: var(--fe-lightgreen);
    }
</style>
