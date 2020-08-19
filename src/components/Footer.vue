<template>
    <div class="Footer">
        <p><strong>Copyright&COPY; 2020 FlowerEvolver</strong><a href="https://github.com/cristianglezm/FlowerEvolver-frontend"><img :src="this.base_url + 'find-on-github.png'"/></a></p>
    </div>
</template>

<script>
    export default {
        name:'Footer',
        data(){
            return {
                base_url: process.env.BASE_URL,
            }
        },
    }
</script>

<style scoped>
    .Footer{
        background-color: rgb(37, 39, 41);
        color: white;
    }
    .Footer img{
        float: right;
        position: relative;
        bottom: 20px;
        margin-bottom: 10px;
    }
    @media only screen and (max-width: 740px){
        .Footer img{
            float: right;
            position: relative;
            width: 25%;
            height: 25%;
            bottom: 25px;
            margin-bottom: 5px;
            left: 35px;
        }
    }
    .Footer p{
        margin-left: 20px;
        position: relative;
        bottom: 10px;
        padding: 40px 40px 0px 0px;
    }
</style>