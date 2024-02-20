<template>
  <div class="LastAdded">
    <FlowersTable :Flowers="flowers" :isLocal="false" :noFlowerMessage="'There are no Flowers'" />
  </div>
</template>

<script setup>

    import FlowersTable from '../components/FlowersTable.vue';
    import { useFlowersStore } from '../store';
    import { onMounted, onUnmounted, computed } from 'vue';

    const store = useFlowersStore();
    let flowers = computed(() => {
        return store.lastAdded
    });
    onMounted( () => {
        updateList(30, 0);
        store.timer = window.setInterval(updateList, 30000, 30, 0);
    });
    onUnmounted(() => {
        window.clearInterval(store.timer);
        store.timer = 0;
    });
    const updateList = (limit, offset) => {
        store.updateLastAdded({limit: limit, offset: offset});
    };
</script>

<style scoped>
    .LastAdded{
        background-color: rgb(37, 39, 41);
    }
</style>
