<template>
    <div class="Ancestors">
        <div v-if="!hasFatherOnly()">
            <div class="gridFlowers">
                <div><Flower :id="flower1.id" :genome="flower1.genome" :image="flower1.image" :isLocal="isLocal"/></div>
                <div><Flower :id="flower2.id" :genome="flower2.genome" :image="flower2.image" :isLocal="isLocal"/></div>
            </div>
            <div class="header"><p><strong>Descendants of {{flower1.id}} and {{flower2.id}}</strong></p></div>
            <FlowersTable :Flowers="ancestors" :isLocal="isLocal" :noFlowerMessage="'These Flowers have no descendants.'"/>
        </div>
        <div v-else>
            <div class="fatherFlower">
                <Flower :id="flower1.id" :genome="flower1.genome" :image="flower1.image" :isLocal="isLocal"/>
            </div>
            <div class="header"><p><strong>Descendants of {{flower1.id}}</strong></p></div>
            <FlowersTable :Flowers="ancestors" :isLocal="isLocal" :noFlowerMessage="'This Flower has no descendants.'"/>
        </div>
    </div>
</template>

<script>
	import { mapActions, mapGetters } from 'pinia';
	import { useFlowersStore } from '../store';
	import Flower from '../components/Flower.vue';
	import FlowersTable from '../components/FlowersTable.vue';
	import { defineComponent } from 'vue';
	
    export default defineComponent({
        name:'Ancestors',
        components:{
            Flower,
            FlowersTable,
        },
        created(){
            this.offset = 0;
            this.$store.ancestors = [];
            this.isLocal = this.$route.params.isLocal === "local";
        },
        mounted: function(){
            this.Init();
            this.scroll();
        },
        data(){
            return {
                flower1: {id:0, genome:"", image:""},
                flower2: {id:0, genome:"", image:""}
            };
        },
        computed:{
            ancestors(){
                return this.$store.getAncestors();
            },
        },
        methods:{
            ...mapGetters(useFlowersStore, [
                'getAncestors',
            ]),
            ...mapActions(useFlowersStore, [
                'updateAndConcatRemoteAncestors',
                'updateAndConcatLocalAncestors',
                'increaseOffset'
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
                this.updateAncestors(this.$store.settings.limit, this.offset);
            },
            updateAncestors: function(limit, offset){
                if(this.isLocal){
                    if(this.hasFatherOnly()){
                        this.updateAndConcatLocalAncestors({flower1:this.flower1,limit:limit, offset:offset});
                    }else{
                        this.updateAndConcatLocalAncestors({flower1:this.flower1, flower2: this.flower2,limit:limit, offset:offset});
                    }
                }else{
                    if(this.hasFatherOnly()){
                        this.updateAndConcatRemoteAncestors({flower1:this.flower1,limit:limit, offset:offset});
                    }else{
                        this.updateAndConcatRemoteAncestors({flower1:this.flower1, flower2: this.flower2,limit:limit, offset:offset});
                    }
                }
                this.offset = this.increaseOffset(this.offset);
            },
            scroll: function(){
                window.onscroll = function(){
                    var bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
                    if(bottomOfWindow){
                        this.updateAncestors(this.$store.settings.limit, this.offset);
                    }
                }.bind(this);
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
        grid-gap: 10px;
        justify-content: center;
    }
</style>
