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
	import { defineComponent } from 'vue';
    import Flower from '../components/Flower.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import { mapActions, mapGetters } from 'pinia';
	import { useFlowersStore } from '../store';
	
    export default defineComponent({
        name:'Mutations',
        components:{
            Flower,
            FlowersTable,
        },
        created(){
            this.flower = { id:this.$route.params.id, genome:this.$route.params.id + '.json', image:this.$route.params.id + '.png'};
            this.$store.query.offset = 0;
            this.$store.mutations = [];
            this.updateMutations({flower:this.flower, limit:this.$store.query.limit, offset:this.$store.query.offset});
            this.increaseOffset();
        },
        computed:{
            mutations:{
                get(){
                    return this.$store.getMutations();
                },
                set(){
                    
                },
            },
        },
        methods:{
            ...mapGetters(useFlowersStore, [
              'getMutations',
            ]),
            ...mapActions(useFlowersStore, [
              'updateMutations',
              'updateAndConcatMutations',
            ]),
            getMutations: function(limit, offset){
                this.updateAndConcatMutations({flower:this.flower,limit:limit, offset:offset});
                this.mutations = this.$store.mutations;
                this.increaseOffset();
            },
            scroll: function(){
                window.onscroll = function(){
                    var bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
                    if(bottomOfWindow){
                        this.getMutations(this.$store.query.limit, this.$store.query.offset);
                    }
                }.bind(this);
            },
            increaseOffset: function(){
                this.$store.query.offset = this.$store.query.offset + this.$store.query.limit;
            },
        },
        mounted: function(){
            this.scroll();
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