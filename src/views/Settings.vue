<template>
  <div style="background-color: rgb(37, 39, 41); padding: 0.6rem;">
    <div id="settings-container">
      <div class="grid-x4">
        <CreationParams />
        <mutationRates />
        <AppOptions />
        <CaptionerModelOptions />
      </div>
      <div class="flex">
        <AppActions />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Settings View
 * View for managing application settings and performing various 
 * actions such as exporting, importing, and deleting flowers.
 *
 * @component Settings
 * @example
 * // Component usage in another component or view.
 * <template>
 *    <Settings />
 * </template>
 * // then in script setup
 *  import Settings from '@/views/Settings.vue';
 **/
import AppOptions from '../components/AppOptions.vue';
import CreationParams from '../components/CreationParams.vue';
import MutationRates from '../components/MutationRates.vue';
import AppActions from '../components/AppActions.vue';
import CaptionerModelOptions from '../components/CaptionerModelOptions.vue';

</script>

<style scoped>
    #settings-container{
        color: lightgreen;
        background-color: rgb(37, 39, 41);
        font-size: 1.25rem;
    }
    .grid-x4{
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(35%, 1fr));
        grid-gap: 0.6rem;
        justify-content: space-around;
        position: relative;
    }
    .flex{
        display: flex;
        flex-flow: column nowrap;
    }
    @media only screen and (max-width: 1280px){
        #settings-container{
            font-size: 0.9rem;
        }
        .grid-x4{
            grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
            width: 100%;
        }
    }

</style>
