<template>
    <div class="Mutations">
        <div class="mutFlower">
            <Flower :id="original.id" :genome="original.genome" :image="original.image" :isLocal="isLocal"/>
        </div>
        <div class="header"><p><strong>Mutations of {{original.id}}</strong></p></div>
        <PaginationOrInfiniteScroll :pagination="isPaginated()" :itemsLength="mutations.length" :currentPage="this.page" :totalPages="this.totalPages"
                                    @next-page="nextPage" @prev-page="prevPage" @update-page="updateMutations">
            <FlowersTable :Flowers="mutations" :isLocal="this.isLocal" :noFlowerMessage="'This Flower Has no Mutations.'"/>
        </PaginationOrInfiniteScroll>
    </div>
</template>

<script>
	import { defineComponent } from 'vue';
    import Flower from '../components/Flower.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
    import { mapActions, mapGetters } from 'pinia';
	import { useFlowersStore } from '../store';
	
    export default defineComponent({
        name:'Mutations',
        components:{
            Flower,
            FlowersTable,
            PaginationOrInfiniteScroll
        },
        created(){
            this.offset = 0;
            this.$store.mutations = [];
        },
        mounted: function(){
            this.Init();
        },
        data(){
            return {
                original: {id:0, genome:"", image:""},
                offset: 0,
                page: parseInt(this.$route.query.page, 10) || 0,
                totalPages: 0,
                isLocal: this.$route.params.isLocal === "local",
            };
        },
        computed:{
            mutations(){
                return this.$store.getMutations();
            },
        },
        methods:{
            ...mapGetters(useFlowersStore, [
                'getMutations',
            ]),
            ...mapActions(useFlowersStore, [
                'updateRemoteMutations',
                'updateLocalMutations',
                'updateAndConcatRemoteMutations',
                'updateAndConcatLocalMutations',
                'getRemoteMutationsCount',
                'getLocalMutationsCount',
                'increaseOffset',
                'calcOffset'
            ]),
            Init: async function(){
                let originalID = parseInt(this.$route.params.id);
                if(this.isLocal){
                    await this.$store.db.flowers.get(originalID).then(f => this.original = f);
                }else{
                    this.original = { id: originalID, genome: originalID + '.json', image: originalID + '.png'};
                }
                if(this.isPaginated()){
                    if(this.isLocal){
                        this.getLocalMutationsCount(this.original.id).then(c => this.totalPages = Math.round(c / this.$store.settings.limit));;
                    }else{
                        this.getRemoteMutationsCount(this.original.id).then(c => this.totalPages = Math.round(c / this.$store.settings.limit));;
                    }
                    this.getMutationsFrom(this.page);
                }else{
                    this.updateMutations();
                }
            },
            getMutationsFrom: function(page){
                this.$nextTick(() => {
                    this.offset = this.calcOffset(page);
                    if(this.isLocal){
                        this.updateLocalMutations({flower: this.original, limit:this.$store.settings.limit, offset:this.offset});
                    }else{
                        this.updateRemoteMutations({flower: this.original, limit:this.$store.settings.limit, offset:this.offset});
                    }
                });
            },
            updateMutations: function(){
                if(this.isLocal){
                    this.updateAndConcatLocalMutations({flower: this.original, limit:this.$store.settings.limit, offset:this.offset});
                }else{
                    this.updateAndConcatRemoteMutations({flower: this.original, limit:this.$store.settings.limit, offset:this.offset});
                }
                this.offset = this.increaseOffset(this.offset);
            },
            prevPage: function(){
                if(this.page >= 1){
                    this.page -= 1;
                    this.pushRoute();
                }
            },
            nextPage: function(){
                if(this.page < this.totalPages){
                    this.page += 1;
                    this.pushRoute();
                }
            },
            pushRoute: function(){
                let localOr = this.isLocal ? "local":"remote";
                this.$router.push({name:"Mutations", params: {id: this.original.id, isLocal: localOr}, query:{page:this.page}});
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
    .Mutations{
        background-color: black;
    }
    .header{
        text-align: center;
        color: lightgreen;
        background-color: green;
    }
    .mutFlower{
        position: relative;
        display: grid;
        justify-items: center;
    }
</style>