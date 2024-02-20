<template>
  <div v-if="props.errors.length" class="ErrorModal center">
    <span class="close" @click="clearErrors()">&times;</span>
    <div v-for="(error, id) in props.errors" :key="id">
      <div v-if="id === (props.errors.length - 1)" class="ErrorModal-content">
        <p>
          {{ error.message }}
          <span style="border-radius: 128px; background-color: red; padding: 2px;">
            {{ props.errors.length }}
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
 * @prop {Array} errors - The array of error objects to be displayed in the modal.
 *
 * @example
 * // usage in a parent component:
 * <template>
 *   <ErrorModal :errors="errorList" />
 * </template>
 *
 * @example
 * // usage in another component, view or store actions.
 * const store = useFlowerStore();
 * store.$state.errors.push({message: "error 1"});
 * store.$state.errors.push({message: "error 2"});
 */
import { useFlowersStore } from '../store';

const store = useFlowersStore();
const props = defineProps({
    errors:{
        type: Array,
        required: true,
    }
});
const clearErrors = () => {
    store.errors = [];
};
const popError = () => {
    store.errors.pop();
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
        z-index: 1;
    }
    p{
        font-size: 1.6rem;
        overflow: auto;
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
