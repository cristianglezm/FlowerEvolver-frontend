<template>
    <div class="LastAdded">
        <FlowersTable :Flowers="flowers" :useUrl="true" :noFlowerMessage="'There are no flowers'"/>
    </div>
</template>

<script>
    import FlowersTable from '../components/FlowersTable.vue';
    import { mapActions } from 'vuex'
    export default{
        name:'LastAdded',
        components:{
            FlowersTable,
        },
        created(){
            this.updateList(28,0);
        },
        computed:{
            flowers: {
                get(){
                    return this.$store.state.lastAdded;
                },
                set(){
                    
                },
            },
        },
        beforeDestroy(){
            window.clearInterval(this.$store.state.timer);
        },
        mounted: function(){
            this.$store.state.timer = window.setInterval(this.updateList, 30000, 28, 0);
        },
        methods:{
            ...mapActions([
              'updateLastAdded',
            ]),
            updateList: function(limit, offset){
                this.updateLastAdded({limit:limit, offset:offset});
                this.flowers = this.$store.state.lastAdded;
            },
        },
    }
</script>

<style scoped>
    .LastAdded{
        background-color: black;
    }
</style>
