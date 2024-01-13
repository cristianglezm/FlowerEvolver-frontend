<template>
    <div class="Mutations">
        <div class="mutFlower">
            <Flower :id="original.id" :genome="original.genome" :image="original.image" :isLocal="this.isLocal"/>
        </div>
        <div class="header"><p><strong>Mutations of {{original.id}}</strong></p></div>
        <FlowersTable :Flowers="mutations" :isLocal="this.isLocal" :noFlowerMessage="'This Flower Has no Mutations.'"/>
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
            this.offset = 0;
            this.$store.mutations = [];
            this.isLocal = this.$route.params.isLocal === "local";
        },
        mounted: function(){
            this.Init();
            this.scroll();
        },
        data(){
            return {
                original: {id:0, genome:"", image:""},
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
                'updateAndConcatRemoteMutations',
                'updateAndConcatLocalMutations',
                'increaseOffset'
            ]),
            Init: async function(){
                let originalID = parseInt(this.$route.params.id);
                if(this.isLocal){
                    await this.$store.db.flowers.get(originalID).then(f => this.original = f);
                }else{
                    this.original = { id: originalID, genome: originalID + '.json', image: originalID + '.png'};
                }
                this.updateMutations(this.$store.settings.limit, this.offset);
            },
            updateMutations: function(limit, offset){
                if(this.isLocal){
                    this.updateAndConcatLocalMutations({flower: this.original, limit: limit, offset: offset});
                }else{
                    this.updateAndConcatRemoteMutations({flower: this.original, limit: limit, offset: offset});
                }
                this.offset = this.increaseOffset(this.offset);
            },
            scroll: function(){
                window.onscroll = function(){
                    var bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
                    if(bottomOfWindow){
                        this.updateMutations(this.$store.settings.limit, this.offset);
                    }
                }.bind(this);
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