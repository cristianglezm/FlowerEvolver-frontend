import { defineStore } from 'pinia';
import plugins from './plugins';
import { db as ddb } from './db';
import axios from 'axios';

export const API = import.meta.env.VITE_APP_API_URL;
export const URL = import.meta.env.VITE_APP_IMAGES_URL;
export const STORAGE_KEY = 'FlowerEvolver';
//import { instantiateStreaming } from '@assemblyscript/loader';
import feWASM from '/FlowerEvolver.wasm?url';
import { Module } from '/FlowerEvolver.js?url';

export const useFlowersStore = defineStore('FlowersStore', {
	state: () => ({
		fe: null,
		canvas: document.getElementById("canvas"),
		db: ddb,
		remoteflowers: [],
		localFlowers: [],
		lastAdded: [],
		mutations: [],
		ancestors: [],
		errors: [],
		params: { radius:64, numLayers:3, P: 6.0, bias: 1.0 },
		mutationRates: { addNodeRate: 0.2, addConnRate: 0.3, removeConnRate: 0.2, perturbWeightsRate: 0.6, enableRate: 0.35, disableRate: 0.3, actTypeRate: 0.4 },
		remoteSelected: { index: 0, flowers: [] },
		localSelected: { index: 0, flowers: [] },
		query: { limit: 28, offset: 0 },
		timer: 0,
		favourites: [],
		loadFlowers: JSON.parse(localStorage.getItem(STORAGE_KEY) || 'true'),
	}),
	getters: {
		getRemoteSelected: (state) => {
			return state.remoteSelected.flowers;
		},
		getLocalSelected: (state) => {
			return state.localSelected.flowers;
		},
		isLocalFlowerSelected: (state) => (flower) => {
			if(state.localSelected.flowers.length > 1)
				return (flower.id === state.localSelected.flowers[0] || flower.id === state.localSelected.flowers[1]);
			return false;
		},
		isRemoteFlowerSelected: (state) => (flower) => {
			if(state.remoteSelected.flowers.length > 1)
				return (flower.id === state.remoteSelected.flowers[0] || flower.id === state.remoteSelected.flowers[1]);
			return false;
		},
		getRemoteFlowers: (state) => () => {
			return state.remoteFlowers;
		},
		getLocalFlowers: (state) => () => {
			return state.localFlowers;
		},
		getMutations: (state) => () => {
			return state.mutations;
		},
		getAncestors: (state) => () => {
			return state.ancestors;
		},
		getDataURL: (state) => () => {
			return state.canvas.toDataURL();
		}
	},
	actions: {
		async loadFE(){
			fetch(feWASM).then((_) => {
				Module.locateFile = feWASM;
				this.fe = Module;
			});
		},
		setCanvasImageData(data){
			this.canvas.putImageData(data, 0, 0);
		},
		async addRemoteFlowerToLocal(flower){
			// @todo
			try{
				let genome = await axios.get(URL + '/' + flower.genome)
					.then(response => {
						return response.text();
					});
				let image = await axios.get(URL + '/' + flower.image)
					.then(response => {
						return response.blob();
					}).then((data) => {
						let width = this.state.params.radius * 2;
						let height = this.state.params.radius * 3;
						let img = new imageData([data], width, height);
						setCanvasImageData(img);
					});
				return await this.db.flowers.add({
					genome: genome,
					image: this.getDataURL()
				});
			}catch(e){
				this.errors.push({message: e});
			}
			return null;
		},
		addFlowerToFav(id){
			this.db.favourites.add(id);
			this.db.flowers.get(id)
				.then((f) => {
					this.favourites.push(f);
				});
		},
		removeFlowerFromFav(flower){
			// @todo adapt to use db
			this.db.favourites.where("id").equals(flower.id).delete();
		},
		selectRemoteFlower(flower){
			this.remoteSelected.flowers[this.remoteSelected.index] = flower.id;
			this.remoteSelected.index++;
			if(this.remoteSelected.index > 1){
				this.remoteSelected.index = 0;
			}
		},
		selectLocalFlower(flower){
			this.localSelected.flowers[this.localSelected.index] = flower.id;
			this.localSelected.index++;
			if(this.localSelected.index > 1){
				this.localSelected.index = 0;
			}
		},
		async makeRemoteFlower(){
			await axios.post(API + 'flowers',{})
			.then(response => {
				this.remoteFlowers.unshift(response.data);
				this.lastAdded.unshift(response.data);
			}).catch(e => {
				this.errors.push({message:e});
			});
		},
		async makeLocalFlower(){
			try{
				if(this.fe){
					if(!this.db.isOpen()){
						this.db.open();
					}
					let genome = this.fe.makeFlower(this.params.radius, this.params.numLayers, this.params.P, this.params.bias);
					let id = await this.db.flowers.add({
						genome: genome, 
						image: this.getDataURL()
					});
					let f = await this.db.flowers.get(id);
					this.localFlowers.unshift(f);
				}else{
					this.errors.push({message:"FlowerEvolver WASM module not loaded"});
					loadFE();
				}
			}catch(e){
				this.errors.push({message: e});
			}
		},
		async updateRemoteFlowers({limit, offset}){
			try{
				const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
				this.remoteFlowers = response.data.flowers;
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateLocalFlowers({limit, offset}){
			try{
				const flowers = await this.db.flowers.reverse().limit(limit).offset(offset).toArray();
				this.localFlowers = flowers;
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateAndConcatRemoteFlowers({limit, offset}){
			try{
				const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
				this.remoteFlowers = this.remoteFlowers.concat(response.data.flowers);
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateAndConcatLocalFlowers({limit, offset}){
			try{
				const flowers = await this.db.flowers.limit(limit).offset(offset).toArray();
				this.localFlowers = this.localFlowers.concat(flowers);
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
		async updateRemoteMutations({flower, limit, offset}){
			try{
				const response = await axios.get(API + 'mutations/' + flower.id + '?limit=' + limit + '&offset=' + offset)
				this.mutations = response.data;
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateLocalMutations({flower, limit, offset}){
			try{
				const mutations = await this.db.mutations.where("original").equals(flower.id).limit(limit).offset(offset).toArray();
				const flowers = await this.db.flowers.bulkGet(mutations);
				this.mutations = flowers;
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateAndConcatRemoteMutations({flower, limit, offset}){
			try{
				const response = await axios.get(API + 'mutations/' + flower.id +'?limit=' + limit + '&offset=' + offset)
				this.mutations = this.mutations.concat(response.data);
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateAndConcatLocalMutations({flower, limit, offset}){
			try{
				const mutations = await this.db.mutations.where("original").equals(flower.id).limit(limit).offset(offset).toArray();
				const flowers = await this.db.flowers.bulkGet(mutations, "id").toArray();
				this.mutations = this.mutations.concat(flowers);
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateRemoteAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					const response = await axios.get(API + 'ancestors/' + flower1.id + '?limit=' + limit + '&offset=' + offset)
					this.ancestors = response.data;
				}else{
					const response = await axios.get(API + 'ancestors/' + flower1.id + '/' + flower2.id + '?limit=' + limit + '&offset=' + offset)
					this.ancestors = response.data;
				}
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateLocalAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					const descendants = await this.db.flowers.where("father").equals(flower1.id).limit(limit).offset(offset).toArray();
					const flowers = await this.db.flowers.bulkGet(descendants, "id").toArray();
					this.ancestors = flowers;
				}else{
					const descendants = await this.db.flowers.where("father").equals(flower1.id).or()
												.where("mother").equals(flower2.id).limit(limit).offset(offset).toArray();
					const flowers = await this.db.flowers.bulkGet(descendants, "id").toArray();
					this.ancestors = flowers;
				}
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateAndConcatRemoteAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					const response = await axios.get(API + 'ancestors/' + flower1.id + '?limit=' + limit + '&offset=' + offset)
					this.ancestors = this.ancestors.concat(response.data);
				}else{
					const response = await axios.get(API + 'ancestors/' + flower1.id + '/' + flower2.id + '?limit=' + limit + '&offset=' + offset)
					this.ancestors = this.ancestors.concat(response.data);
				}
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateAndConcatLocalAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					const descendants = await this.db.flowers.where("father").equals(flower1.id).limit(limit).offset(offset).toArray();
					const flowers = await this.db.flowers.bulkGet(descendants, "id").toArray();
					this.ancestors = this.ancestors.concat(flowers);
				}else{
					const descendants = await this.db.flowers.where("father").equals(flower1.id).or()
												.where("mother").equals(flower2.id).limit(limit).offset(offset).toArray();
					const flowers = await this.db.flowers.bulkGet(descendants, "id").toArray();
					this.ancestors = this.ancestors.concat(flowers);
				}
			}catch(e){
				this.errors.push({message:e});
			}
		},
		remoteReproduce(){
			if(this.remoteSelected.flowers.length > 1){
				let postData = { father: this.remoteSelected.flowers[0], mother: this.remoteSelected.flowers[1]}
				axios.post(API + 'ancestors', postData)
				.then(response => {
					this.remoteFlowers.unshift(response.data);
					this.lastAdded.unshift(response.data);
					this.ancestors.unshift(response.data);
				})
				.catch(e => {
					this.errors.push({message:e});
				});
			}else{
				this.errors.push({message:"There are no Flowers Selected"});
			}
		},
		async localReproduce(){
			if(this.fe){
				if(this.localSelected.flowers.length > 1){
					let f1 = this.localSelected.flowers[0];
					let f2 = this.localSelected.flowers[1];
					let genome = this.fe.reproduce(f1.genome, 
													f2.genome,
													this.params.radius, this.params.numLayers, 
													this.params.P, this.params.bias);
					let id = await this.db.flowers.add({
						genome: genome,
						image: this.getDataURL()
					});
					this.db.descendants.add({
						id: id,
						father: f1.id, 
						mother: f2.id
						}).catch(e => {
							this.errors.push({message: e});
						});
					let f = await this.db.flowers.get(id);
					this.localFlowers.unshift(f);
				}else{
					this.errors.push({message:"There are no Flowers Selected"});
				}
			}else{
				this.errors.push({message: "WASM module not loaded, try again."});
				loadFE();
			}
		},
		async makeRemoteMutation(flower){
			await axios.post(API + 'mutations', {original:flower.id})
			.then(response => {
				this.remoteFlowers.unshift(response.data);
				this.lastAdded.unshift(response.data);
				this.mutations.unshift(response.data);
			})
			.catch(e => {
				this.errors.push({message:e});
			});
		},
		async makeLocalMutation(flower){
			if(this.fe){
				try{
					let genome = this.fe.mutate(flower.genome, 
													this.params.radius, this.params.numLayers, 
													this.params.P, this.params.bias,
													this.mutationRates.addNodeRate, this.mutationRates.addConnRate, 
													this.mutationRates.removeConnRate, this.mutationRates.perturbWeightsRate, 
													this.mutationRates.enableRate, this.mutationRates.disableRate, this.mutationRates.actTypeRate
												);
					let id = await this.db.flowers.add({
						genome: genome, 
						image: this.getDataURL()
					});
					this.db.mutations.add({
						id: id, 
						original: flower.id
					}).catch(e => createModal(e));
					let f = await this.db.flowers.get(id);
					this.localFlowers.unshift(f);
				}catch(e){
					this.errors.push({message: e});
				}
			}else{
				this.errors.push({message: "WASM module not loaded, try again."});
				loadFE();
			}
		},
	},
	plugins,
});
