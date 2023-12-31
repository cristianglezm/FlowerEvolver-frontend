<template>
    <div class="LastAdded">
        <FlowersTable :Flowers="flowers" :isLocal="false" :noFlowerMessage="'There are no flowers'"/>
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
            this.updateList(28,0);
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
            window.clearInterval(this.$store.timer);
        },
        mounted: function(){
            this.$store.timer = window.setInterval(this.updateList, 30000, 28, 0);
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
