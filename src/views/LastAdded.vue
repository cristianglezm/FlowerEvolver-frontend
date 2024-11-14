<template>
  <div class="LastAdded">
    <FlowersTable :flowers="flowers" :isLocal="false" :noFlowerMessage="'There are no Flowers'" />
  </div>
</template>

<script setup>

    import FlowersTable from '../components/FlowersTable.vue';
    import { useFlowerStore } from '../stores/FlowerStore';
    import { onMounted, onUnmounted, computed } from 'vue';

    const FlowerStore = useFlowerStore();
    let flowers = computed(() => {
        return FlowerStore.lastAdded
    });
    onMounted( () => {
        updateList(30, 0);
        FlowerStore.timer = window.setInterval(updateList, 30000, 30, 0);
    });
    onUnmounted(() => {
        window.clearInterval(FlowerStore.timer);
        FlowerStore.timer = 0;
    });
    const updateList = (limit, offset) => {
        FlowerStore.updateLastAdded({limit: limit, offset: offset});
    };
</script>

<style scoped>
    .LastAdded{
        background-color: rgb(37, 39, 41);
    }
</style>
