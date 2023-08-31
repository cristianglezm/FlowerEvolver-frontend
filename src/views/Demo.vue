<template>
    <div class="Demo">
        <FlowersTable :Flowers="flowers" :useUrl="false" :noFlowerMessage="'There is a Problem'"/>
    </div>
</template>

<script>
	import { defineComponent } from 'vue';
    import FlowersTable from '../components/FlowersTable.vue';
	
    export default defineComponent({
        name:'Demo',
        components:{
            FlowersTable,
        },
        data(){
            return {
                flowers: [
                            {id: 1, genome: JSON.stringify('@/assets/flowers/1.json'), image: this.loadImage("flowers/1.png")},
                            {id: 2, genome: JSON.stringify('@/assets/flowers/2.json'), image: this.loadImage("flowers/2.png")},
                            {id: 3, genome: JSON.stringify('@/assets/flowers/3.json'), image: this.loadImage("flowers/3.png")},
                            {id: 4, genome: JSON.stringify('@/assets/flowers/4.json'), image: this.loadImage("flowers/4.png")},
                            {id: 5, genome: JSON.stringify('@/assets/flowers/5.json'), image: this.loadImage("flowers/5.png")},
                            {id: 6, genome: JSON.stringify('@/assets/flowers/6.json'), image: this.loadImage("flowers/6.png")},
                            {id: 7, genome: JSON.stringify('@/assets/flowers/7.json'), image: this.loadImage("flowers/7.png")},
                            {id: 8, genome: JSON.stringify('@/assets/flowers/8.json'), image: this.loadImage("flowers/8.png")},
                            {id: 9, genome: JSON.stringify('@/assets/flowers/9.json'), image: this.loadImage("flowers/9.png")},
                            {id: 10, genome: JSON.stringify('@/assets/flowers/10.json'), image: this.loadImage("flowers/10.png")},
                            {id: 11, genome: JSON.stringify('@/assets/flowers/11.json'), image: this.loadImage("flowers/11.png")},
                            {id: 12, genome: JSON.stringify('@/assets/flowers/12.json'), image: this.loadImage("flowers/12.png")},
                            {id: 13, genome: JSON.stringify('@/assets/flowers/13.json'), image: this.loadImage("flowers/13.png")},
                            {id: 14, genome: JSON.stringify('@/assets/flowers/14.json'), image: this.loadImage("flowers/14.png")},
                            {id: 15, genome: JSON.stringify('@/assets/flowers/15.json'), image: this.loadImage("flowers/15.png")},
                            {id: 16, genome: JSON.stringify('@/assets/flowers/16.json'), image: this.loadImage("flowers/16.png")},
                            {id: 17, genome: JSON.stringify('@/assets/flowers/17.json'), image: this.loadImage("flowers/17.png")},
                            {id: 18, genome: JSON.stringify('@/assets/flowers/18.json'), image: this.loadImage("flowers/18.png")},
                            {id: 19, genome: JSON.stringify('@/assets/flowers/19.json'), image: this.loadImage("flowers/19.png")},
                            {id: 20, genome: JSON.stringify('@/assets/flowers/20.json'), image: this.loadImage("flowers/20.png")},
                            {id: 21, genome: JSON.stringify('@/assets/flowers/21.json'), image: this.loadImage("flowers/21.png")},
                            {id: 22, genome: JSON.stringify('@/assets/flowers/22.json'), image: this.loadImage("flowers/22.png")},
                            {id: 23, genome: JSON.stringify('@/assets/flowers/23.json'), image: this.loadImage("flowers/23.png")},
                            {id: 24, genome: JSON.stringify('@/assets/flowers/24.json'), image: this.loadImage("flowers/24.png")},
                            {id: 25, genome: JSON.stringify('@/assets/flowers/25.json'), image: this.loadImage("flowers/25.png")},
                            {id: 26, genome: JSON.stringify('@/assets/flowers/26.json'), image: this.loadImage("flowers/26.png")},
                            {id: 27, genome: JSON.stringify('@/assets/flowers/27.json'), image: this.loadImage("flowers/27.png")},
                            {id: 28, genome: JSON.stringify('@/assets/flowers/28.json'), image: this.loadImage("flowers/28.png")},
                            {id: 29, genome: JSON.stringify('@/assets/flowers/29.json'), image: this.loadImage("flowers/29.png")},
                            {id: 30, genome: JSON.stringify('@/assets/flowers/30.json'), image: this.loadImage("flowers/30.png")},
                            {id: 31, genome: JSON.stringify('@/assets/flowers/31.json'), image: this.loadImage("flowers/31.png")},
                            {id: 32, genome: JSON.stringify('@/assets/flowers/32.json'), image: this.loadImage("flowers/32.png")},
                            {id: 33, genome: JSON.stringify('@/assets/flowers/33.json'), image: this.loadImage("flowers/33.png")},
                            {id: 34, genome: JSON.stringify('@/assets/flowers/34.json'), image: this.loadImage("flowers/34.png")},
                            {id: 35, genome: JSON.stringify('@/assets/flowers/35.json'), image: this.loadImage("flowers/35.png")},
                            {id: 36, genome: JSON.stringify('@/assets/flowers/36.json'), image: this.loadImage("flowers/36.png")}
                        ]
            }
        },
		methods:{
			loadImage: function(url){
				return new URL(`/src/assets/${url}`, import.meta.url).toString();
			},
		},
    });
</script>

<style scoped>
    .Demo{
        background-color: grey;
    }
</style>
