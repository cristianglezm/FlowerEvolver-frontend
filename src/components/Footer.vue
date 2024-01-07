<template>
    <div class="Footer">
        <p><strong>Copyright&COPY; 2024 FlowerEvolver</strong></p><a href="https://github.com/cristianglezm/FlowerEvolver-frontend"><img :src="this.base_url + 'find-on-github.png'"/></a>
    </div>
</template>

<script>
	import { defineComponent } from 'vue';

    export default defineComponent({
        name:'Footer',
        data(){
            return {
                base_url: import.meta.env.BASE_URL,
            }
        },
    });
</script>

<style scoped>
    .Footer{
        background-color: rgb(37, 39, 41);
        color: white;
        display: grid;
        grid-template-columns: auto auto;
        justify-items: stretch;
    }
    .Footer img{
        float: right;
        position: relative;
        top: 20px;
        right: 20px;
    }
    .Footer p{
        margin-left: 20px;
        float: left;
        position: relative;
        bottom: 20px;
        padding: 40px 40px 0px 0px;
    }
</style>
