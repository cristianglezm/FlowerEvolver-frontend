<template>
    <div class="Demo">
        <FlowersTable :Flowers="flowers" :isLocal="true" :noFlowerMessage="'There are no Flowers'"/>
    </div>
</template>

<script>
    import { defineComponent } from 'vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import { mapActions, mapGetters } from 'pinia';
    import { useFlowersStore } from '../store';

    export default defineComponent({
        name:'Demo',
        components:{
            FlowersTable,
        },
        created(){
			this.loadDemoFlowers();
			this.offset = 0;
			this.updateLocalFlowers({limit:this.$store.settings.limit, offset:this.offset});
			this.offset = this.increaseOffset(this.offset);
        },
        data(){
            return {
                demoFlowers: [
                            {id: 1, genome: this.loadUrl('flowers/1.json'), image: this.loadUrl("flowers/1.png")},
                            {id: 2, genome: this.loadUrl('flowers/2.json'), image: this.loadUrl("flowers/2.png")},
                            {id: 3, genome: this.loadUrl('flowers/3.json'), image: this.loadUrl("flowers/3.png")},
                            {id: 4, genome: this.loadUrl('flowers/4.json'), image: this.loadUrl("flowers/4.png")},
                            {id: 5, genome: this.loadUrl('flowers/5.json'), image: this.loadUrl("flowers/5.png")},
                            {id: 6, genome: this.loadUrl('flowers/6.json'), image: this.loadUrl("flowers/6.png")},
                            {id: 7, genome: this.loadUrl('flowers/7.json'), image: this.loadUrl("flowers/7.png")},
                            {id: 8, genome: this.loadUrl('flowers/8.json'), image: this.loadUrl("flowers/8.png")},
                            {id: 9, genome: this.loadUrl('flowers/9.json'), image: this.loadUrl("flowers/9.png")},
                            {id: 10, genome: this.loadUrl('flowers/10.json'), image: this.loadUrl("flowers/10.png")},
                            {id: 11, genome: this.loadUrl('flowers/11.json'), image: this.loadUrl("flowers/11.png")},
                            {id: 12, genome: this.loadUrl('flowers/12.json'), image: this.loadUrl("flowers/12.png")},
                            {id: 13, genome: this.loadUrl('flowers/13.json'), image: this.loadUrl("flowers/13.png")},
                            {id: 14, genome: this.loadUrl('flowers/14.json'), image: this.loadUrl("flowers/14.png")},
                            {id: 15, genome: this.loadUrl('flowers/15.json'), image: this.loadUrl("flowers/15.png")},
                            {id: 16, genome: this.loadUrl('flowers/16.json'), image: this.loadUrl("flowers/16.png")},
                            {id: 17, genome: this.loadUrl('flowers/17.json'), image: this.loadUrl("flowers/17.png")},
                            {id: 18, genome: this.loadUrl('flowers/18.json'), image: this.loadUrl("flowers/18.png")},
                            {id: 19, genome: this.loadUrl('flowers/19.json'), image: this.loadUrl("flowers/19.png")},
                            {id: 20, genome: this.loadUrl('flowers/20.json'), image: this.loadUrl("flowers/20.png")},
                            {id: 21, genome: this.loadUrl('flowers/21.json'), image: this.loadUrl("flowers/21.png")},
                            {id: 22, genome: this.loadUrl('flowers/22.json'), image: this.loadUrl("flowers/22.png")},
                            {id: 23, genome: this.loadUrl('flowers/23.json'), image: this.loadUrl("flowers/23.png")},
                            {id: 24, genome: this.loadUrl('flowers/24.json'), image: this.loadUrl("flowers/24.png")},
                            {id: 25, genome: this.loadUrl('flowers/25.json'), image: this.loadUrl("flowers/25.png")},
                            {id: 26, genome: this.loadUrl('flowers/26.json'), image: this.loadUrl("flowers/26.png")},
                            {id: 27, genome: this.loadUrl('flowers/27.json'), image: this.loadUrl("flowers/27.png")},
                            {id: 28, genome: this.loadUrl('flowers/28.json'), image: this.loadUrl("flowers/28.png")},
                            {id: 29, genome: this.loadUrl('flowers/29.json'), image: this.loadUrl("flowers/29.png")},
                            {id: 30, genome: this.loadUrl('flowers/30.json'), image: this.loadUrl("flowers/30.png")},
                            {id: 31, genome: this.loadUrl('flowers/31.json'), image: this.loadUrl("flowers/31.png")},
                            {id: 32, genome: this.loadUrl('flowers/32.json'), image: this.loadUrl("flowers/32.png")},
                            {id: 33, genome: this.loadUrl('flowers/33.json'), image: this.loadUrl("flowers/33.png")},
                            {id: 34, genome: this.loadUrl('flowers/34.json'), image: this.loadUrl("flowers/34.png")},
                            {id: 35, genome: this.loadUrl('flowers/35.json'), image: this.loadUrl("flowers/35.png")},
                            {id: 36, genome: this.loadUrl('flowers/36.json'), image: this.loadUrl("flowers/36.png")}
                        ]
            }
        },
        computed:{
            flowers(){
                return this.$store.getLocalFlowers();
            },
        },
        methods:{
            ...mapGetters(useFlowersStore, [
                'getLocalFlowers',
            ]),
            ...mapActions(useFlowersStore, [
                'updateLocalFlowers',
                'updateAndConcatLocalFlowers',
                'setLoadDemoFlowers',
                'increaseOffset',
                'calcOffset'
            ]),
            loadUrl: function(url){
                return new URL(`/src/assets/${url}`, import.meta.url).toString();
            },
            scroll: function(){
                window.onscroll = function(){
                    console.log("flowers length: ", this.flowers.length);
                    let bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
                    if(bottomOfWindow){
                        this.updateAndConcatLocalFlowers({limit: this.$store.settings.limit, offset: this.offset});
                        this.offset = this.increaseOffset(this.offset);
                        console.log("offset: ", this.offset);
                        console.log("flowers length: ", this.flowers.length);
                    }
                }.bind(this);
            },
            isPaginated: function(){
                return this.$store.settings.pagination;
            },
            addDemoFlowerToLocal: async function(flower){
                try{
                    let genome = await fetch(flower.genome)
                        .then(response => {
                            return response.text();
                        });
                    let response = await fetch(flower.image);
                    if(!response.ok){
                        this.$store.errors.push({message: 'Failed to load image: ${response.status} ${response.statusText}'});
                    }
                    let data = await response.arrayBuffer();
                    let canvas = document.createElement('canvas');
                    let ctx = canvas.getContext('2d');
                    let img = new Image();
                    img.onload = function(){
                        canvas.width = this.width;
                        canvas.height = this.height;
                        ctx.drawImage(this, 0, 0);
                    };
                    img.src = window.URL.createObjectURL(new Blob([data]));
                    await img.decode();
                    this.$store.db.flowers.add({
                        genome: genome,
                        image: canvas.toDataURL()
                    }).then(id => {
                        this.$store.db.flowers.get(id).then((f) => {
                            this.$store.localFlowers.unshift(f);
                        });
                    });
                }catch(e){
                    this.$store.errors.push({message: e});
                }
            },
            loadDemoFlowers: async function(){
                if(this.$store.settings.loadDemoFlowers){
                    for(const f of this.demoFlowers){
                        await this.addDemoFlowerToLocal(f);
                    }
                    this.setLoadDemoFlowers(false);
                }
            },
        },
        mounted: function(){
            console.log("mounted");
            if(!this.isPaginated()){
                this.scroll();
            }
        },
    });
</script>

<style scoped>
    .Demo{
        background-color: black;
    }
</style>
