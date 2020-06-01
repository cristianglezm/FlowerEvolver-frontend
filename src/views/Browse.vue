<template>
    <div class="Browse" @onscroll="this.scroll">
        <FlowersTable :Flowers="flowers" :useUrl="true" :noFlowerMessage="'There are no Flowers'"/>
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
            this.updateFlowers({limit:this.$store.state.query.limit, offset:this.$store.state.query.offset});
            this.increaseOffset();
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
        },
        mounted: function(){
            this.scroll();
        },
    }
</script>

<style scoped>
    .Browse{
        margin: 0px 10px 10px 10px;
        background-color: black;
    }
</style>