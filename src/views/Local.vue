<template>
    <div class="Local">
        <PaginationOrInfiniteScroll :pagination="isPaginated()" :itemsLength="flowers.length" :currentPage="this.page" :totalPages="this.totalPages"
                                    @next-page="this.nextPage" @prev-page="this.prevPage" @update-page="this.nextBatch">
            <FlowersTable :Flowers="flowers" :isLocal="true" :noFlowerMessage="'There are no Flowers'"/>
        </PaginationOrInfiniteScroll>
    </div>
</template>

<script>
    import { defineComponent } from 'vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
    import { mapActions, mapState } from 'pinia';
    import { useFlowersStore } from '../store';

    export default defineComponent({
        name:'Local',
        components:{
            FlowersTable,
            PaginationOrInfiniteScroll
        },
        created(){
			this.loadDemoFlowers();
			this.offset = 0;
            this.page = parseInt(this.$route.query.page, 10) || 0;
        },
        mounted(){
            if(this.isPaginated()){
                this.getFlowersFrom(this.page);
                this.getLocalFlowersCount().then(c => this.totalPages = Math.round(c / this.$store.settings.limit));
            }else{
                this.updateLocalFlowers({limit:this.$store.settings.limit, offset:this.offset});
                this.offset = this.increaseOffset(this.offset);
            }
        },
        data(){
            return {
                /// @todo replace with web worker import - delete flower images from assets, change #.json for a generation.json?
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
                            {id: 12, genome: this.loadUrl('flowers/12.json'), image: this.loadUrl("flowers/12.png")}
                        ],
                page: 0,
                totalPages: 0
            }
        },
        computed:{
            ...mapState(useFlowersStore, {
                flowers: store => store.getLocalFlowers()
            })
        },
        methods:{
            ...mapActions(useFlowersStore, [
                'updateLocalFlowers',
                'updateAndConcatLocalFlowers',
                'setLoadDemoFlowers',
                'increaseOffset',
                'calcOffset',
                'getLocalFlowersCount'
            ]),
            loadUrl: function(url){
                return new URL(`/src/assets/${url}`, import.meta.url).toString();
            },
            nextBatch: function(){
                this.updateFlowers(this.$store.settings.limit, this.offset);
            },
            updateFlowers: function(limit, offset){
                this.updateAndConcatLocalFlowers({limit:limit, offset:offset});
                this.offset = this.increaseOffset(offset);
            },
            getFlowersFrom: function(page){
                this.$nextTick(() => {
                    this.offset = this.calcOffset(page);
                    this.updateLocalFlowers({limit:this.$store.settings.limit, offset:this.offset});
                });
            },
            prevPage: function(){
                if(this.page >= 1){
                    this.page -= 1;
                    this.$router.push({path:"Local", query:{page:this.page}});
                }
            },
            nextPage: function(){
                if(this.page < this.totalPages){
                    this.page += 1;
                    this.$router.push({path:"Local", query:{page:this.page}});
                }
            },
            isPaginated: function(){
                return this.$store.settings.pagination;
            },
            isMobile: function(){
                return screen.width <= 1280;
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
    });
</script>

<style scoped>
    .Local{
        background-color: rgb(37, 39, 41);
    }
</style>
