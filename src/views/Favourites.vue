<template>
    <PaginationOrInfiniteScroll :pagination="isPaginated()" :itemsLength="favourites.length" :currentPage="this.page" :totalPages="this.totalPages"
                                    @next-page="nextPage" @prev-page="prevPage" @update-page="updateFlowers">
        <div class="grid" v-if="favourites && favourites.length">
            <div v-for="flower in favourites" :key="flower.id">
                <Flower :id="flower.id" :genome="flower.genome" :image="flower.image" :isLocal="true"/>
            </div>
        </div>
        <div v-else>
            <p class="nofavs">You don't Have Favourites.</p>
        </div>
    </PaginationOrInfiniteScroll>
</template>

<script>
	import { defineComponent } from 'vue';
    import { mapActions } from 'pinia';
    import Flower from '../components/Flower.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
	import { useFlowersStore } from '../store';

    export default defineComponent({
        name:'Favourites',
        components:{
            Flower,
            PaginationOrInfiniteScroll
        },
        created(){
            this.offset = 0;
            this.page = parseInt(this.$route.query.page, 10) || 0;
        },
        mounted(){
            this.$store.favourites = [];
            if(this.isPaginated()){
                /// @todo add other limits?
                this.$store.settings.limit = this.isMobile() ? 4:10;
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
    .grid{
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        grid-gap: 10px;
        background-color: black;
    }
    @media only screen and (max-width: 1280px){
        .grid{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            grid-gap: 10px;
            background-color: black;
        }
    }
    .nofavs{
        color: lightgreen;
        font-size: large;
        padding: 15px;
        background-color: rgb(37, 39, 41);
        margin: 0px;
    }
</style>
