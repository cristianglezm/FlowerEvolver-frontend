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
            this.offset = 0;
            this.$store.mutations = [];
            this.isLocal = this.$route.params.isLocal === "local";
            let originalID = this.$route.params.id;
            if(this.isLocal){
                this.flower = {id:0, genome:"", image:""};
                this.$store.db.flowers.get(originalID).then(f => this.flower = f)
            }else{
                this.flower = { id: originalID, genome: originalID + '.json', image: originalID + '.png'};
            }
            this.updateMutations({flower:this.flower, limit:this.$store.settings.limit, offset:this.offset});
            this.offset = this.increaseOffset(this.offset);
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
                'increaseOffset'
            ]),
            getMutations: function(limit, offset){
                this.updateAndConcatMutations({flower:this.flower,limit:limit, offset:offset});
                this.mutations = this.$store.mutations;
                this.offset = this.increaseOffset(this.offset);
            },
            scroll: function(){
                window.onscroll = function(){
                    var bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
                    if(bottomOfWindow){
                        this.getMutations(this.$store.settings.limit, this.offset);
                    }
                }.bind(this);
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