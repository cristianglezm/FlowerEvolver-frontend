<template>
  <div class="loading-overlay">
    <div class="spinner" />
    <p>{{ props.message }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
    message: {
        type: String,
        required: true
    }
});
</script>

<style scoped>
  .loading-overlay{
    padding: 5px;
    display: flex;
    background-color: var(--fe-surface);
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
    color: var(--fe-lightgreen);
  }
  .spinner{
     border: 4px solid var(--fe-spinner-track);
     border-top: 4px solid var(--fe-lightgreen);
     border-radius: 50%;
     width: 40px;
     height: 40px;
     animation: spin 1s linear infinite;
     margin-bottom: 0.5rem;
   }
   @keyframes spin{
     0% { transform: rotate(0deg); }
     100% { transform: rotate(360deg); }
  }
</style>
