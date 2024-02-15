<template>
    <footer class="Footer">
        <p><strong>Copyright&COPY; 2024 FlowerEvolver</strong></p><a href="https://github.com/cristianglezm/FlowerEvolver-frontend"><img alt="find-on-github" :src="data.base_url + 'find-on-github.png'"/></a>
    </footer>
</template>

<script setup>

const data = {
    base_url: import.meta.env.BASE_URL
}

</script>

<style scoped>
    .Footer{
        background-color: rgb(37, 39, 41);
        color: lightgreen;
        display: grid;
        grid-template-columns: auto auto;
        justify-items: stretch;
        position: relative;
    }
    .Footer img{
        float: right;
        position: relative;
        top: 1.2rem;
        right: 1.2rem;
    }
    .Footer p{
        margin-left: 2rem;
        float: left;
        position: relative;
        bottom: 1.2rem;
        padding: 2rem 2rem 0rem 0rem;
    }
</style>
