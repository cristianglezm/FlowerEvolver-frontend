import { defineStore } from 'pinia';
import plugins from './plugins';

import axios from 'axios';
export const API = import.meta.env.VITE_APP_API_URL;
export const STORAGE_KEY = 'FlowerEvolver';

export const useFlowersStore = defineStore('FlowersStore', {
	state: () => ({
		flowers: [],
		lastAdded: [],
		mutations: [],
		ancestors: [],
		errors: [],
		selected: { index: 0, flowers: [] },
		query: { limit: 28, offset: 0 },
		timer: 0,
		favourites: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
	}),
	getters: {
		getSelected: (state) => {
			return state.selected.flowers;
		},
		isFlowerSelected: (state) => (flower) => {
			if(state.selected.flowers.length > 1)
				return (flower.id === state.selected.flowers[0] || flower.id === state.selected.flowers[1]);
			return false;
		},
		getFlowers: (state) => () => {
			return state.flowers;
		},
		getMutations: (state) => () => {
			return state.mutations;
		},
		getAncestors: (state) => () => {
			return state.ancestors;
		},
	},
	actions: {
		addFlowerToFav(flower){
			this.favourites.push(flower);
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.favourites))
		},
		removeFlowerFromFav(flower){
			this.favourites = this.favourites.filter(
				function(value){
					return value.id !== flower.id;
			}.bind(this));
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.favourites));
		},
		selectFlower(flower){
			this.selected.flowers[this.selected.index] = flower.id;
			this.selected.index++;
			if(this.selected.index > 1){
				this.selected.index = 0;
			}
		},
		async makeFlower(){
			await axios.post(API + 'flowers',{})
			.then(response => {
				this.flowers.unshift(response.data);
				this.lastAdded.unshift(response.data);
			})
			.catch(e => {
				this.errors.push({message:e});
			});
		},
		async updateFlowers({limit, offset}){
			try{
				const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
				this.flowers = response.data.flowers;
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateAndConcatFlowers({limit, offset}){
			try{
				const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
				this.flowers = this.flowers.concat(response.data.flowers);
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateLastAdded({limit, offset}){
			try{
				const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
				this.lastAdded = response.data.flowers;
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateMutations({flower, limit, offset}){
			try{
				const response = await axios.get(API + 'mutations/' + flower.id + '?limit=' + limit + '&offset=' + offset)
				this.mutations = response.data;
			}catch(e){
				//this.errors.push({message:e});
			}
		},
		async updateAndConcatMutations({flower, limit, offset}){
			try{
				const response = await axios.get(API + 'mutations/' + flower.id +'?limit=' + limit + '&offset=' + offset)
				this.mutations = this.mutations.concat(response.data);
			}catch(e){
				//this.errors.push({message:e});
			}
		},
		async updateAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					const response = await axios.get(API + 'ancestors/' + flower1.id + '?limit=' + limit + '&offset=' + offset)
					this.ancestors = response.data;
				}else{
					const response = await axios.get(API + 'ancestors/' + flower1.id + '/' + flower2.id + '?limit=' + limit + '&offset=' + offset)
					this.ancestors = response.data;
				}
			}catch(e){
				//this.errors.push({message:e});
			}
		},
		async updateAndConcatAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					const response = await axios.get(API + 'ancestors/' + flower1.id + '?limit=' + limit + '&offset=' + offset)
					this.ancestors = this.ancestors.concat(response.data);
				}else{
					const response = await axios.get(API + 'ancestors/' + flower1.id + '/' + flower2.id + '?limit=' + limit + '&offset=' + offset)
					this.ancestors = this.ancestors.concat(response.data);
				}
			}catch(e){
				//this.errors.push({message:e});
			}
		},
		reproduce(){
			if(this.selected.flowers.length > 1){
				var postData = { father: this.selected.flowers[0], mother: this.selected.flowers[1]}
				axios.post(API + 'ancestors', postData)
				.then(response => {
					this.flowers.unshift(response.data);
					this.lastAdded.unshift(response.data);
					this.ancestors.unshift(response.data);
				})
				.catch(e => {
					this.errors.push({message:e});
				});
			}else{
				this.errors.push({message:"There are no Flowers selected"});
			}
		},
		async makeMutation(flower){
			await axios.post(API + 'mutations', {original:flower.id})
			.then(response => {
				this.flowers.unshift(response.data);
				this.lastAdded.unshift(response.data);
				this.mutations.unshift(response.data);
			})
			.catch(e => {
				this.errors.push({message:e});
			});
		},
	},
	plugins,
});
