import { defineStore } from 'pinia';

export const useErrorStore = defineStore('ErrorStore', {
	state: () => ({
        errors: [],
    }),
    getters:{
        getErrors: (state) => {
            return state.errors;
        },
        getLength : (state) => {
            return state.errors.length;
        }
    },
    actions:{
        push(error){
            this.errors.push(error);
        },
        pop(){
            this.errors.pop();
        },
        clear(){
            this.errors = [];
        },
    },
});