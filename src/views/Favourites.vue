<template>
    <div id="favourites">
        <PaginationOrInfiniteScroll :pagination="isPaginated()" :itemsLength="favourites.length" :currentPage="this.page" :totalPages="this.totalPages"
                                    @next-page="nextPage" @prev-page="prevPage" @update-page="updateFlowers">
            <FlowersTable :Flowers="favourites" :isLocal="true" :noFlowerMessage="'You don\'t have favourites.'"/>
        </PaginationOrInfiniteScroll>
    </div>
</template>

<script>
	import { defineComponent } from 'vue';
    import { mapActions } from 'pinia';
    import Flower from '../components/Flower.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
	import { useFlowersStore } from '../store';

    export default defineComponent({
        name:'Favourites',
        components:{
            Flower,
            FlowersTable,
            PaginationOrInfiniteScroll
        },
        created(){
            this.offset = 0;
            this.page = parseInt(this.$route.query.page, 10) || 0;
        },
        mounted(){
            this.$store.favourites = [];
            if(this.isPaginated()){
                this.getFlowersFrom(this.page);
                this.getFavouritesCount().then(c => this.totalPages = Math.round(c / this.$store.settings.limit));
            }else{
                this.updateFlowers();
            }
        },
        data(){
            return{
                offset: 0,
                page: 0,
                totalPages: 0,
            }
        },
        computed:{
            favourites(){
                return this.$store.favourites;
            },
        },
        methods: {
            ...mapActions(useFlowersStore, [
                'increaseOffset',
                'calcOffset',
                'getFavouritesCount'
            ]),
            prevPage: function(){
                if(this.page >= 1){
                    this.page -= 1;
                    this.$router.push({path:"Favourites", query:{page:this.page}});
                }
            },
            nextPage: function(){
                if(this.page < this.totalPages){
                    this.page += 1;
                    this.$router.push({path:"Favourites", query:{page:this.page}});
                }
            },
            isPaginated: function(){
                return this.$store.settings.pagination;
            },
            isMobile: function(){
                return screen.width <= 1280;
            },
            updateFlowers: function(){
                this.loadFavourites();
                this.offset = this.increaseOffset(this.offset);
            },
            getFlowersFrom: function(page){
                this.$store.favourites = [];
                this.$nextTick(() => {
                    this.offset = this.calcOffset(page);
                    this.loadFavourites();
                });
            },
            loadFavourites: async function(){
                await this.$store.db.favourites.reverse().offset(this.offset)
                .limit(this.$store.settings.limit).toArray()
                .then(ids => {
                    for(const id of ids){
                        this.$store.db.flowers.get(id)
                        .then(f => this.favourites.push(f));
                    }
                });
            },
        },
    });
</script>
<style scoped>
    #favourites{
        background-color: rgb(37, 39, 41);;
    }
</style>