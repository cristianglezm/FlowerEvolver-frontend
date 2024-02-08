<template>
    <div class="Ancestors">
        <div v-if="!hasFatherOnly()">
            <div class="gridFlowers">
                <div><Flower :id="flower1.id" :genome="flower1.genome" :image="flower1.image" :isLocal="isLocal"/></div>
                <div><Flower :id="flower2.id" :genome="flower2.genome" :image="flower2.image" :isLocal="isLocal"/></div>
            </div>
            <div class="header"><p><strong>Descendants of {{flower1.id}} and {{flower2.id}}</strong></p></div>
            <PaginationOrInfiniteScroll :pagination="isPaginated()" :itemsLength="ancestors.length" :currentPage="this.page" :totalPages="this.totalPages"
                                    @next-page="nextPage" @prev-page="prevPage" @update-page="updateAncestors">
                <FlowersTable :Flowers="ancestors" :isLocal="isLocal" :noFlowerMessage="'These Flowers have no descendants.'"/>
            </PaginationOrInfiniteScroll>
        </div>
        <div v-else>
            <div class="fatherFlower">
                <Flower :id="flower1.id" :genome="flower1.genome" :image="flower1.image" :isLocal="isLocal"/>
            </div>
            <div class="header"><p><strong>Descendants of {{flower1.id}}</strong></p></div>
            <PaginationOrInfiniteScroll :pagination="isPaginated()" :itemsLength="ancestors.length" :currentPage="this.page" :totalPages="this.totalPages"
                                    @next-page="nextPage" @prev-page="prevPage" @update-page="updateAncestors">
                <FlowersTable :Flowers="ancestors" :isLocal="isLocal" :noFlowerMessage="'This Flower has no descendants.'"/>
            </PaginationOrInfiniteScroll>
        </div>
    </div>
</template>

<script>
	import { mapActions, mapState } from 'pinia';
	import { useFlowersStore } from '../store';
	import Flower from '../components/Flower.vue';
	import FlowersTable from '../components/FlowersTable.vue';
    import PaginationOrInfiniteScroll from '../components/PaginationOrInfiniteScroll.vue';
	import { defineComponent } from 'vue';
	
    export default defineComponent({
        name:'Ancestors',
        components:{
            Flower,
            FlowersTable,
            PaginationOrInfiniteScroll
        },
        created(){
            this.offset = 0;
            this.$store.ancestors = [];
            this.isLocal = this.$route.params.isLocal === "local";
        },
        mounted: function(){
            this.Init();
        },
        data(){
            return {
                offset: 0,
                page: parseInt(this.$route.query.page, 10) || 0,
                totalPages: 0,
                flower1: {id:0, genome:"", image:""},
                flower2: {id:0, genome:"", image:""}
            };
        },
        computed:{
            ...mapState(useFlowersStore, {
                ancestors: store => store.getAncestors()
            })
        },
        methods:{
            ...mapActions(useFlowersStore, [
                'updateRemoteAncestors',
                'updateAndConcatRemoteAncestors',
                'updateLocalAncestors',
                'updateAndConcatLocalAncestors',
                'getRemoteAncestorsCount',
                'getLocalAncestorsCount',
                'increaseOffset',
                'calcOffset'
            ]),
            hasFatherOnly: function(){
                return this.$route.params.mother === undefined;
            },
            Init: async function(){
                if(this.isLocal){
                    let dadID = parseInt(this.$route.params.father);
                    await this.$store.db.flowers.get(dadID).then((f) => this.flower1 = f);
                    if(!this.hasFatherOnly()){
                        let momID = parseInt(this.$route.params.mother);
                        await this.$store.db.flowers.get(momID).then((f) => this.flower2 = f);
                    }
                }else{
                    let dadID = parseInt(this.$route.params.father);
                    this.flower1 = { id: dadID, genome: dadID + '.json', image: dadID + '.png'};
                    if(!this.hasFatherOnly()){
                        let momID = parseInt(this.$route.params.mother);
                        this.flower2 = { id: momID, genome: momID + '.json', image: momID + '.png'};
                    }
                }
                if(this.isPaginated()){
                    if(this.isLocal){
                        if(this.hasFatherOnly()){
                            this.getLocalAncestorsCount(this.flower1.id)
                                .then(c => this.totalPages = Math.round(c / this.$store.settings.limit));;
                        }else{
                            this.getLocalAncestorsCount(this.flower1.id, this.flower2.id, this.flower2.id)
                                .then(c => this.totalPages = Math.round(c / this.$store.settings.limit));;
                        }
                    }else{
                        if(this.hasFatherOnly()){
                            this.getRemoteAncestorsCount(this.flower1.id)
                                .then(c => this.totalPages = Math.round(c / this.$store.settings.limit));;
                        }else{
                            this.getRemoteAncestorsCount(this.flower1.id, this.flower2.id)
                                .then(c => this.totalPages = Math.round(c / this.$store.settings.limit));;
                        }
                    }
                    this.getAncestorsFrom(this.page);
                }else{
                    this.updateAncestors();
                }
            },
            getAncestorsFrom: function(page){
                this.$nextTick(() => {
                    this.offset = this.calcOffset(page);
                    if(this.isLocal){
                        if(this.hasFatherOnly()){
                            this.updateLocalAncestors({flower1: this.flower1, limit:this.$store.settings.limit, offset:this.offset});
                        }else{
                            this.updateLocalAncestors({flower1: this.flower1, flower2: this.flower2, limit:this.$store.settings.limit, offset:this.offset});
                        }
                    }else{
                        if(this.hasFatherOnly()){
                            this.updateRemoteAncestors({flower1: this.flower1, limit:this.$store.settings.limit, offset:this.offset});
                        }else{
                            this.updateRemoteAncestors({flower1: this.flower1, flower2: this.flower2, limit:this.$store.settings.limit, offset:this.offset});
                        }
                    }
                });
            },
            updateAncestors: function(){
                if(this.isLocal){
                    if(this.hasFatherOnly()){
                        this.updateAndConcatLocalAncestors({flower1:this.flower1,limit:this.$store.settings.limit, offset:this.offset});
                    }else{
                        this.updateAndConcatLocalAncestors({flower1:this.flower1, flower2: this.flower2,limit:this.$store.settings.limit, offset:this.offset});
                    }
                }else{
                    if(this.hasFatherOnly()){
                        this.updateAndConcatRemoteAncestors({flower1:this.flower1,limit:this.$store.settings.limit, offset:this.offset});
                    }else{
                        this.updateAndConcatRemoteAncestors({flower1:this.flower1, flower2: this.flower2,limit:this.$store.settings.limit, offset:this.offset});
                    }
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
                if(this.hasFatherOnly()){
                    this.$router.push({name:"DescendantsFatherOrMother", params: {father: this.flower1.id, isLocal: localOr}, query:{page:this.page}});
                }else{
                    this.$router.push({name:"DescendantsFatherAndMother", params: {father: this.flower1.id, mother: this.flower2.id, isLocal: localOr}, query:{page:this.page}});
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
    .Ancestors{
        background-color: black;
    }
    .header{
        text-align: center;
        color: lightgreen;
        background-color: green;
    }
    .fatherFlower{
        display: grid;
        justify-items: center;
        position: relative;
    }
    .gridFlowers{
        display: grid;
        grid-template-columns: auto auto;
        grid-gap: 0.6rem;
        justify-content: center;
    }
</style>
