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
            <div class="flower">
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
    import { mapActions, mapGetters } from 'vuex'
    export default{
        name:'Ancestors',
        components:{
            Flower,
            FlowersTable,
        },
        created(){
            this.$store.state.query.offset = 0;
            this.$store.state.ancestors = [];
            this.flower1 = { id:this.$route.params.father, genome:this.$route.params.father+'.json', image:this.$route.params.father+'.png'};
            if(this.checkFlowers()){
                this.updateAndConcatAncestors({flower1:this.flower1,limit:this.$store.state.query.limit, offset:this.$store.state.query.offset});
            }else{
                this.flower2 = { id:this.$route.params.mother, genome:this.$route.params.mother+'.json', image:this.$route.params.mother+'.png'};
                this.updateAndConcatAncestors({flower1:this.flower1, flower2: this.flower2,limit:this.$store.state.query.limit, offset:this.$store.state.query.offset});
            }
            this.increaseOffset();
        },
        computed:{
            ancestors:{
                get(){
                    return this.$store.getters.getAncestors();
                },
                set(){
                    
                },
            },
        },
        methods:{
            ...mapGetters([
              'getAncestors',
            ]),
            ...mapActions([
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
                this.ancestors = this.$store.getters.getAncestors;
                this.increaseOffset();
            },
            scroll: function(){
                window.onscroll = function(){
                    var bottomOfWindow = document.documentElement.scrollTop + window.innerHeight === document.documentElement.offsetHeight;
                    if(bottomOfWindow){
                        this.getAncestors(this.$store.state.query.limit, this.$store.state.query.offset);
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
    .Ancestors{
        background-color: black;
    }
    .header{
        text-align: center;
        color: lightgreen;
        background-color: green;
    }
    .flower{
        position: relative;
        left: 43%;
        width:15%;
        height:15%;
    }
    .gridFlowers{
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        grid-gap: 10px;
        position: relative;
        left: 36%;
        width: 33%;
    }
</style>