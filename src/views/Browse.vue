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
    import { mapActions, mapGetters } from 'pinia';
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
                /// @todo add other limits?
                this.$store.settings.limit = this.isMobile() ? 4:10;
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
            flowers(){
                return this.$store.getRemoteFlowers();
            },
        },
        methods:{
            ...mapGetters(useFlowersStore, [
                'getRemoteFlowers',
            ]),
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
                return screen.width <= 1280;
            },
        },
    });
</script>

<style scoped>
    .Browse{
        background-color: black;
    }
</style>