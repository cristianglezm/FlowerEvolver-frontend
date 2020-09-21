<template>
    <div class="Mutations" @onscroll="this.scroll">
        <div class="mutFlower">
            <Flower :id="flower.id" :genome="flower.genome" :image="flower.image" :useUrl="true"/>
        </div>
        <div class="header"><p><strong>Mutations of {{flower.id}}</strong></p></div>
        <FlowersTable :Flowers="mutations" :useUrl="true" :noFlowerMessage="'This Flower Has no Mutations.'"/>
    </div>
</template>

<script>
    import Flower from '../components/Flower.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import { mapActions, mapGetters } from 'vuex'
    export default{
        name:'Mutations',
        components:{
            Flower,
            FlowersTable,
        },
        created(){
            this.flower = { id:this.$route.params.id, genome:this.$route.params.id+'.json', image:this.$route.params.id+'.png'};
            this.$store.state.query.offset = 0;
            this.$store.state.mutations = [];
            this.updateMutations({flower:this.flower, limit:this.$store.state.query.limit, offset:this.$store.state.query.offset});
            this.increaseOffset();
        },
        computed:{
            mutations:{
                get(){
                    return this.$store.getters.getMutations();
                },
                set(){
                    
                },
            },
        },
        methods:{
            ...mapGetters([
              'getMutations',
            ]),
            ...mapActions([
              'updateMutations',
              'updateAndConcatMutations',
            ]),
            getMutations: function(limit, offset){
                this.updateAndConcatMutations({flower:this.flower,limit:limit, offset:offset});
                this.mutations = this.$store.state.mutations;
                this.increaseOffset();
            },
            scroll: function(){
                window.onscroll = function(){
                    var bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
                    if(bottomOfWindow){
                        this.getMutations(this.$store.state.query.limit, this.$store.state.query.offset);
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