<template>
    <div v-if="props.errors.length" class="ErrorModal">
        <span @click="clearErrors()" class="close">&times;</span>
        <div v-for="(error, id) in props.errors" :key="id">
            <div class="ErrorModal-content" v-if="id === (props.errors.length - 1)">
                <p>
                    {{error.message}}
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
    store.$state.errors = [];
};
const popError = () => {
    store.$state.errors.pop();
};

</script>

<style scoped>
    .ErrorModal{
        background-color: green;
        color: lightgreen;
        position: fixed;
        border: solid;
        border-color: lightgreen;
        border-radius: 5px;
        top: 40%;
        left: 40%;
        box-shadow: 0px 16px 32px 0px rgba(0,0,0,0.3);
        overflow: auto;
        z-index: 1;
    }
    p{
        font-size: 26px;
        overflow: auto;
    }
    .ErrorModal-content{
        margin: 15% auto;
        padding: 20px;
        width: 80%;
        overflow: auto;
    }
    .ErrorModal button{
        background-color: green;
        color: lightgreen;
        border-color: lightgreen;
        position: relative;
        left:45%;
        margin-bottom: 10px;
    }
    .close{
        color: lightgreen;
        margin-right: 5px;
        float: right;
        font-size: 38px;
        font-weight: bold;
    }
    .close:hover,
    .close:focus{
        color: black;
        text-decoration: none;
        cursor: pointer;
    }
</style>
