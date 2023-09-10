<template>
    <div class="Ancestors" @onscroll="this.scroll">
        <div v-if="!checkFlowers()">
            <div class="gridFlowers">
                <div><Flower :id="flower1.id" :genome="flower1.genome" :image="flower1.image" :useUrl="true"/></div>
                <div><Flower :id="flower2.id" :genome="flower2.genome" :image="flower2.image" :useUrl="true"/></div>
            </div>
            <div class="header"><p><strong>Descendants of {{flower1.id}} and {{flower2.id}}</strong></p></div>
        </div>
        <div v-else>
            <div class="fatherFlower">
                <Flower :id="flower1.id" :genome="flower1.genome" :image="flower1.image" :useUrl="true"/>
            </div>
            <div class="header"><p><strong>Descendants of {{flower1.id}}</strong></p></div>
        </div>
        <FlowersTable :Flowers="ancestors" :useUrl="true" :noFlowerMessage="'These Flowers have no descendants.'"/>
    </div>
</template>

<script>
    import Flower from '../components/Flower.vue';
    import FlowersTable from '../components/FlowersTable.vue';
    import { mapActions, mapGetters } from 'pinia';
	import { useFlowersStore } from '../store';
	import { defineComponent } from 'vue';
	
    export default defineComponent({
        name:'Ancestors',
        components:{
            Flower,
            FlowersTable,
        },
        created(){
            this.$store.query.offset = 0;
            this.$store.ancestors = [];
            this.flower1 = { id:this.$route.params.father, genome:this.$route.params.father+'.json', image:this.$route.params.father+'.png'};
            if(this.checkFlowers()){
                this.updateAndConcatAncestors({flower1:this.flower1,limit:this.$store.query.limit, offset:this.$store.query.offset});
            }else{
                this.flower2 = { id:this.$route.params.mother, genome:this.$route.params.mother+'.json', image:this.$route.params.mother+'.png'};
                this.updateAndConcatAncestors({flower1:this.flower1, flower2: this.flower2,limit:this.$store.query.limit, offset:this.$store.query.offset});
            }
            this.increaseOffset();
        },
        computed:{
            ancestors:{
                get(){
                    return this.$store.getAncestors();
                },
                set(){
                    
                },
            },
        },
        methods:{
            ...mapGetters(useFlowersStore, [
              'getAncestors',
            ]),
            ...mapActions(useFlowersStore, [
              'updateAncestors',
              'updateAndConcatAncestors',
            ]),
            checkFlowers: function(){
                return this.$route.params.mother === undefined;
            },
            getAncestors: function(limit, offset){
                if(this.checkFlowers()){
                    this.updateAndConcatAncestors({flower1:this.flower1,limit:limit, offset:offset});
                }else{
                    this.updateAndConcatAncestors({flower1:this.flower1, flower2: this.flower2,limit:limit, offset:offset});
                }
                this.ancestors = this.$store.getAncestors;
                this.increaseOffset();
            },
            scroll: function(){
                window.onscroll = function(){
                    var bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
                    if(bottomOfWindow){
                        this.getAncestors(this.$store.query.limit, this.$store.query.offset);
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
