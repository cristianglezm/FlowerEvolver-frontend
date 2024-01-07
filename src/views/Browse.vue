<template>
    <div class="Browse" @onscroll="this.scroll">
        <div v-if="this.isPaginated() && flowers.length" class="container">
            <div v-if="flowers.length" class="arrow"><span @click="prevPage()">&lt;</span></div>
            <FlowersTable :Flowers="flowers" :isLocal="false" :noFlowerMessage="'There are no Flowers'"/>
            <div v-if="flowers.length" class="arrow"><span @click="nextPage()">&gt;</span></div>
        </div>
        <div v-else>
            <FlowersTable :Flowers="flowers" :isLocal="false" :noFlowerMessage="'There are no Flowers'"/>
        </div>
    </div>
</template>

<script>
	import { defineComponent } from 'vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import { mapActions, mapGetters } from 'pinia';
	import { useFlowersStore } from '../store';
	
    export default defineComponent({
        name:'Browse',
        components:{
            FlowersTable,
        },
        created(){
            this.offset = 0;
            this.page = parseInt(this.$route.query.page, 10) || 0;
            if(this.isPaginated()){
                this.$store.settings.limit = this.isMobile() ? 4:14;
                this.getFlowersFrom(this.page);
            }else{
                this.updateRemoteFlowers({limit:this.$store.settings.limit, offset:this.offset});
                this.increaseOffset();
            }
        },
        data(){
            return {
                page: 0,
            }
        },
        computed:{
            flowers: {
                get(){
                    return this.$store.getRemoteFlowers();
                },
                set(){
                    
                },
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
                'calcOffset'
            ]),
            getFlowers: function(limit, offset){
                this.updateAndConcatFlowers({limit:limit, offset:offset});
                this.flowers = this.$store.remoteFlowers;
                this.offset = this.increaseOffset(this.offset);
            },
            getFlowersFrom: function(page){
                this.offset = this.calcOffset(page);
                this.updateRemoteFlowers({limit:this.$store.settings.limit, offset:this.offset});
                this.flowers = this.$store.remoteFlowers;
            },
            prevPage: function(){
                if(this.page > 0){
                    this.page -= 1;
                    this.getFlowersFrom(this.page);
                    this.$router.push({path:"Browse", query:{page:this.page}});
                }
            },
            nextPage: function(){
                this.page += 1;
                this.getFlowersFrom(this.page);
                this.$router.push({path:"Browse", query:{page:this.page}});
            },
            scroll: function(){
                window.onscroll = function(){
                    var bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
                    if(bottomOfWindow){
                        this.getRemoteFlowers(this.$store.settings.limit, this.offset);
                    }
                }.bind(this);
            },
            isPaginated: function(){
                return this.$store.settings.pagination;
            },
            isMobile: function(){
                return screen.width <= 1280;
            },
        },
        mounted: function(){
            if(!this.isPaginated()){
                this.scroll();
            }
        },
    });
</script>

<style scoped>
    .Browse{
        background-color: black;
    }
    .container{
        display: grid;
        grid-template-columns: 70px auto 70px;
        grid-gap: 10px;
    }
    @media only screen and (max-width: 1280px){
        .container{
            display: grid;
            grid-template-columns: 20px auto 20px;
            grid-gap: 10px;
        }
    }
    .arrow{
        background-color: rgb(37, 39, 41);
    }
    .arrow span{
        font-size: 50px;
        color: green;
        border-radius: 126px;
        background-color: lightgreen;
        text-align: center;
        padding: 5px 15px 5px 15px;
        position: relative;
        top: 50%;
        left: 0.1em;
        cursor: pointer;
    }
    @media only screen and (max-width: 1280px){
    .arrow span{
        font-size: 25px;
        border-radius: 126px;
        padding: 2px 12px 2px 12px;
        top: 50%;
        left: 0.1em;
    }
    }
    .arrow span:hover{
        background-color: green;
        color: lightgreen;
    }
</style>