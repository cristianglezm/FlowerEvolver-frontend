<template>
  <div v-if="ErrorStore.getLength" class="ErrorModal center">
    <span class="close" @click="clearErrors()">&times;</span>
    <div v-for="(error, id) in errors" :key="id">
      <div v-if="id === (ErrorStore.getLength - 1)" class="ErrorModal-content">
        <p>
          {{ error }}
          <span style="border-radius: 128px; background-color: red; padding: 2px;">
            {{ ErrorStore.getLength }}
          </span>
        </p>
        <button @click="popError()">Ok.</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ErrorModal Component
 * 
 * @example
 * // usage in a parent component:
 * <template>
 *   <ErrorModal />
 * </template>
 *
 * @example
 * // usage in another component, view or store actions.
 * const ErrorStore = useErrorStore();
 * ErrorStore.push("error 1");
 * ErrorStore.push("error 2");
 */
import { computed } from 'vue';
import { useErrorStore } from '../stores/ErrorStore';

const ErrorStore = useErrorStore();

const errors = computed(() => {
    return ErrorStore.getErrors;
})
const clearErrors = () => {
    ErrorStore.clear();
};
const popError = () => {
    ErrorStore.pop();
};

</script>

<style scoped>
    .center{
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }
    .ErrorModal{
        background-color: green;
        color: lightgreen;
        position: fixed;
        border: solid;
        border-color: lightgreen;
        border-radius: 0.31rem;
        box-shadow: 0rem 1rem 2rem 0rem black;
        overflow: auto;
        z-index: 11;
        margin: auto;
        box-sizing: content-box;
    }
    p{
        font-size: 1.6rem;
        overflow: auto;
    }
    @media only screen and (max-width: 1280px){
        p{
            font-size: 0.9rem;
        }
    }
    .ErrorModal-content{
        margin: 15% auto;
        padding: 1.25rem;
        width: 80%;
        overflow: auto;
    }
    .ErrorModal button{
        background-color: green;
        color: lightgreen;
        border-color: lightgreen;
        position: relative;
        left: 45%;
        margin-bottom: 0.6rem;
        cursor: pointer;
    }
    .ErrorModal button:hover{
        color: green;
        border-color: green;
        background-color: lightgreen;
    }
    .close{
        color: lightgreen;
        margin-right: 0.31rem;
        float: right;
        font-size: 2.3rem;
        font-weight: bold;
    }
    .close:hover,
    .close:focus{
        color: black;
        text-decoration: none;
        cursor: pointer;
    }
</style>
