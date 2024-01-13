<template>
    <div class="LastAdded">
        <FlowersTable :Flowers="flowers" :isLocal="false" :noFlowerMessage="'There are no Flowers'"/>
    </div>
</template>

<script>
    import FlowersTable from '../components/FlowersTable.vue';
    import { mapActions } from 'pinia';
	import { useFlowersStore } from '../store';
	import { defineComponent } from 'vue';
	
    export default defineComponent({
        name:'LastAdded',
        components:{
            FlowersTable,
        },
        created(){
            this.updateList(30,0);
        },
        computed:{
            flowers: {
                get(){
                    return this.$store.lastAdded;
                },
                set(){
                    
                },
            },
        },
        beforeDestroy(){
            console.log("beforeDestroy()"); // never called? bug @todo fix
            window.clearInterval(this.$store.timer);
            this.$store.timer = 0;
        },
        mounted: function(){
            this.$store.timer = window.setInterval(this.updateList, 30000, 30, 0);
        },
        methods:{
            ...mapActions(useFlowersStore, ['updateLastAdded']),
            updateList: function(limit, offset){
                this.updateLastAdded({limit:limit, offset:offset});
                this.flowers = this.$store.lastAdded;
            },
        },
    });
</script>

<style scoped>
    .LastAdded{
        background-color: black;
    }
</style>
