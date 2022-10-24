<template>
    <div class="Demo">
        <FlowersTable :Flowers="flowers" :useUrl="false" :noFlowerMessage="'There is a Problem'"/>
    </div>
</template>

<script>
    import FlowersTable from '../components/FlowersTable.vue';
    export default {
        name:'Demo',
        components:{
            FlowersTable,
        },
        data(){
            return {
                flowers: [
                            {id: 1, genome: JSON.stringify('src/assets/flowers/1.json'), image: 'src/assets/flowers/1.png'},
                            {id: 2, genome: JSON.stringify('src/assets/flowers/2.json'), image: 'src/assets/flowers/2.png'},
                            {id: 3, genome: JSON.stringify('src/assets/flowers/3.json'), image: 'src/assets/flowers/3.png'},
                            {id: 4, genome: JSON.stringify('src/assets/flowers/4.json'), image: 'src/assets/flowers/4.png'},
                            {id: 5, genome: JSON.stringify('src/assets/flowers/5.json'), image: 'src/assets/flowers/5.png'},
                            {id: 6, genome: JSON.stringify('src/assets/flowers/6.json'), image: 'src/assets/flowers/6.png'},
                            {id: 7, genome: JSON.stringify('src/assets/flowers/7.json'), image: 'src/assets/flowers/7.png'},
                            {id: 8, genome: JSON.stringify('src/assets/flowers/8.json'), image: 'src/assets/flowers/8.png'},
                            {id: 9, genome: JSON.stringify('src/assets/flowers/9.json'), image: 'src/assets/flowers/9.png'},
                            {id: 10, genome: JSON.stringify('src/assets/flowers/10.json'), image: 'src/assets/flowers/10.png'},
                            {id: 11, genome: JSON.stringify('src/assets/flowers/11.json'), image: 'src/assets/flowers/11.png'},
                            {id: 12, genome: JSON.stringify('src/assets/flowers/12.json'), image: 'src/assets/flowers/12.png'},
                            {id: 13, genome: JSON.stringify('src/assets/flowers/13.json'), image: 'src/assets/flowers/13.png'},
                            {id: 14, genome: JSON.stringify('src/assets/flowers/14.json'), image: 'src/assets/flowers/14.png'},
                            {id: 15, genome: JSON.stringify('src/assets/flowers/15.json'), image: 'src/assets/flowers/15.png'},
                            {id: 16, genome: JSON.stringify('src/assets/flowers/16.json'), image: 'src/assets/flowers/16.png'},
                            {id: 17, genome: JSON.stringify('src/assets/flowers/17.json'), image: 'src/assets/flowers/17.png'},
                            {id: 18, genome: JSON.stringify('src/assets/flowers/18.json'), image: 'src/assets/flowers/18.png'},
                            {id: 19, genome: JSON.stringify('src/assets/flowers/19.json'), image: 'src/assets/flowers/19.png'},
                            {id: 20, genome: JSON.stringify('src/assets/flowers/20.json'), image: 'src/assets/flowers/20.png'},
                            {id: 21, genome: JSON.stringify('src/assets/flowers/21.json'), image: 'src/assets/flowers/21.png'},
                            {id: 22, genome: JSON.stringify('src/assets/flowers/22.json'), image: 'src/assets/flowers/22.png'},
                            {id: 23, genome: JSON.stringify('src/assets/flowers/23.json'), image: 'src/assets/flowers/23.png'},
                            {id: 24, genome: JSON.stringify('src/assets/flowers/24.json'), image: 'src/assets/flowers/24.png'},
                            {id: 25, genome: JSON.stringify('src/assets/flowers/25.json'), image: 'src/assets/flowers/25.png'},
                            {id: 26, genome: JSON.stringify('src/assets/flowers/26.json'), image: 'src/assets/flowers/26.png'},
                            {id: 27, genome: JSON.stringify('src/assets/flowers/27.json'), image: 'src/assets/flowers/27.png'},
                            {id: 28, genome: JSON.stringify('src/assets/flowers/28.json'), image: 'src/assets/flowers/28.png'},
                            {id: 29, genome: JSON.stringify('src/assets/flowers/29.json'), image: 'src/assets/flowers/29.png'},
                            {id: 30, genome: JSON.stringify('src/assets/flowers/30.json'), image: 'src/assets/flowers/30.png'},
                            {id: 31, genome: JSON.stringify('src/assets/flowers/31.json'), image: 'src/assets/flowers/31.png'},
                            {id: 32, genome: JSON.stringify('src/assets/flowers/32.json'), image: 'src/assets/flowers/32.png'},
                            {id: 33, genome: JSON.stringify('src/assets/flowers/33.json'), image: 'src/assets/flowers/33.png'},
                            {id: 34, genome: JSON.stringify('src/assets/flowers/34.json'), image: 'src/assets/flowers/34.png'},
                            {id: 35, genome: JSON.stringify('src/assets/flowers/35.json'), image: 'src/assets/flowers/35.png'},
                            {id: 36, genome: JSON.stringify('src/assets/flowers/36.json'), image: 'src/assets/flowers/36.png'},
                        ]
            }
        },
    }
</script>

<style scoped>
    .Demo{
        background-color: grey;
    }
</style>
