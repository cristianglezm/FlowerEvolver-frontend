<template>
    <div class="Browse">
        <PaginationOrInfiniteScroll :pagination="isPaginated()" :itemsLength="flowers.length" :currentPage="this.page" :totalPages="this.totalPages"
                                    @next-page="nextPage" @prev-page="prevPage" @update-page="nextBatch">
                <FlowersTable :Flowers="flowers" :isLocal="false" :noFlowerMessage="'There are no Flowers'"/>
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
        name:'Browse',
        components:{
            FlowersTable,
            PaginationOrInfiniteScroll
        },
        created(){
            this.offset = 0;
            this.page = parseInt(this.$route.query.page, 10) || 0;
        },
        mounted(){
            if(this.isPaginated()){
                this.getFlowersFrom(this.page);
                this.getRemoteFlowersCount().then(c => this.totalPages = Math.round(c / this.$store.settings.limit));
            }else{
                this.updateRemoteFlowers({limit:this.$store.settings.limit, offset:this.offset});
                this.offset = this.increaseOffset(this.offset);
            }
        },
        data(){
            return {
                page: 0,
                totalPages: 0
            }
        },
        computed:{
            ...mapState(useFlowersStore, {
                flowers: store => store.getRemoteFlowers()
            })
        },
        methods:{
            ...mapActions(useFlowersStore, [
                'updateRemoteFlowers',
                'updateAndConcatRemoteFlowers',
                'increaseOffset',
                'calcOffset',
                'getRemoteFlowersCount'
            ]),
            nextBatch: function(){
                this.updateFlowers(this.$store.settings.limit, this.offset);
            },
            updateFlowers: function(limit, offset){
                this.updateAndConcatRemoteFlowers({limit:limit, offset:offset});
                this.offset = this.increaseOffset(offset);
            },
            getFlowersFrom: function(page){
                this.$nextTick(() => {
                    this.offset = this.calcOffset(page);
                    this.updateRemoteFlowers({limit:this.$store.settings.limit, offset:this.offset});
                });
            },
            prevPage: function(){
                if(this.page >= 1){
                    this.page -= 1;
                    this.$router.push({path:"Browse", query:{page:this.page}});
                }
            },
            nextPage: function(){
                if(this.page < this.totalPages){
                    this.page += 1;
                    this.$router.push({path:"Browse", query:{page:this.page}});
                }
            },
            isPaginated: function(){
                return this.$store.settings.pagination;
            },
            isMobile: function(){
                return window.innerWidth <= 1280;
            },
        },
    });
</script>

<style scoped>
    .Browse{
        background-color: rgb(37, 39, 41);
    }
</style>