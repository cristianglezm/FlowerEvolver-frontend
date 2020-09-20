<template>
    <div class="Browse" @onscroll="this.scroll">
        <div v-if="this.isPaginated() && flowers.length" class="container">
            <div v-if="flowers.length" class="arrow"><span @click="prevPage()">&lt;</span></div>
            <FlowersTable :Flowers="flowers" :useUrl="true" :noFlowerMessage="'There are no Flowers'"/>
            <div v-if="flowers.length" class="arrow"><span @click="nextPage()">&gt;</span></div>
        </div>
        <div v-else>
            <FlowersTable :Flowers="flowers" :useUrl="true" :noFlowerMessage="'There are no Flowers'"/>
        </div>
    </div>
</template>

<script>
    import FlowersTable from '../components/FlowersTable.vue';
    import { mapActions, mapGetters } from 'vuex'
    export default{
        name:'Browse',
        components:{
            FlowersTable,
        },
        created(){
            this.$store.state.query.offset = 0;
            this.page = parseInt(this.$route.query.page, 10) || 0;
            if(this.isPaginated()){
                this.$store.state.query.limit = this.isMobile() ? 4:14;
                this.getFlowersFrom(this.page);
            }else{
                this.$store.state.query.limit = 28;
                this.updateFlowers({limit:this.$store.state.query.limit, offset:this.$store.state.query.offset});
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
                    return this.$store.getters.getFlowers();
                },
                set(){
                    
                },
            },
        },
        methods:{
            ...mapGetters([
              'getFlowers',
            ]),
            ...mapActions([
              'updateFlowers',
              'updateAndConcatFlowers',
            ]),
            getFlowers: function(limit, offset){
                this.updateAndConcatFlowers({limit:limit, offset:offset});
                this.flowers = this.$store.state.flowers;
                this.increaseOffset();
            },
            getFlowersFrom: function(page){
                this.calcOffset(page);
                this.updateFlowers({limit:this.$store.state.query.limit, offset:this.$store.state.query.offset});
                this.flowers = this.$store.state.flowers;
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
                        this.getFlowers(this.$store.state.query.limit, this.$store.state.query.offset);
                    }
                }.bind(this);
            },
            increaseOffset: function(){
                this.$store.state.query.offset = this.$store.state.query.offset + this.$store.state.query.limit;
            },
            calcOffset: function(page){
                this.$store.state.query.offset = page * this.$store.state.query.limit;
            },
            isPaginated: function(){
                return this.$route.query.page >= 0;
            },
            isMobile: function(){
                return screen.width <= 740;
            },
        },
        mounted: function(){
            if(!this.isPaginated()){
                this.scroll();
            }
        },
    }
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
    @media only screen and (max-width: 740px){
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
    @media only screen and (max-width: 740px){
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