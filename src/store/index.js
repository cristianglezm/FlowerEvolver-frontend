import { defineStore } from 'pinia';
import plugins from './plugins';
import { db as ddb } from './db';
import axios from 'axios';

export const API = import.meta.env.VITE_APP_API_URL;
export const URL = import.meta.env.VITE_APP_DOWNLOAD_URL;
export const STORAGE_KEY = 'FlowerEvolverSettings';
//import { instantiateStreaming } from '@assemblyscript/loader';
import feWASM from '/FlowerEvolver.wasm?url';
import { Module } from '/FlowerEvolver.js?url';

export const useFlowersStore = defineStore('FlowersStore', {
	state: () => ({
		fe: null,
		canvas: document.getElementById("canvas"),
		db: ddb,
		remoteFlowers: [],
		localFlowers: [],
		lastAdded: [],
		mutations: [],
		ancestors: [],
		errors: [],
		remoteSelected: { index: 0, flowers: [] },
		localSelected: { index: 0, flowers: [] },
		timer: 0,
		favourites: [],
		settings: JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify({
			params: { radius:64, numLayers:3, P: 6.0, bias: 1.0 },
			mutationRates: { addNodeRate: 0.2, addConnRate: 0.3, removeConnRate: 0.2, perturbWeightsRate: 0.6, enableRate: 0.35, disableRate: 0.3, actTypeRate: 0.4 },
			loadDemoFlowers: true,
			pagination: false,
			limit: 30
		})),
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
		async convertImageArrayBufferToDataURL(data){
			const ctx = this.canvas.getContext("2d");
			let img = new Image();
			let canvas = this.canvas;
			img.onload = function(){
				canvas.width = this.width;
				canvas.height = this.height;
				ctx.drawImage(this, 0, 0);
			};
			img.src = window.URL.createObjectURL(new Blob([data]));
			await img.decode();
			return this.canvas.toDataURL();
		},
		increaseOffset(offset){
			return offset + this.settings.limit;
		},
		calcOffset(page){
			return page * this.settings.limit;
		},
		setLoadDemoFlowers(load){
			this.settings.loadDemoFlowers = load;
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
		},
		async addRemoteFlowerToLocal(flower){
			try{
				let genome = await fetch(URL + flower.genome)
					.then(response => {
						return response.text();
					});
				let response = await fetch(URL + flower.image);
				if(!response.ok){
					this.errors.push({message: 'Failed to load image: ${response.status} ${response.statusText}'});
				}
				let arrBuff = await response.arrayBuffer();
				this.convertImageArrayBufferToDataURL(arrBuff)
				.then((dataURL) => {
					this.db.flowers.add({
						genome: genome,
						image: dataURL
					}).then(id => {
						this.db.flowers.get(id).then((f) => {
							this.localFlowers.unshift(f);
						});
					}).catch(e => this.errors.push({message: e}));
				}).catch(e => this.errors.push({message: e}));
			}catch(e){
				this.errors.push({message: e});
			}
		},
		async isFavourited(id){
			return this.db.favourites.where("id").equals(id).toArray()
						.then((f) => {
							return f.length >= 1;
						})
						.catch(e => this.errors.push({message: e}));
		},
		async addFlowerToFav(id){
			// @todo fix error?
			this.db.favourites.add(id, id)
				.then(id => {
					this.db.flowers.get(id)
						.then((f) => {
							this.favourites.unshift(f);
						})
						.catch(e => this.errors.push({message: e}));
				})
				.catch(e => this.errors.push({message: e}));
		},
		removeFlowerFromFav(id){
			this.db.favourites.where("id").equals(id).delete();
			this.favourites = this.favourites.filter(f => f.id != id);
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
					this.canvas.width = this.settings.params.radius * 2;
					this.canvas.height = this.settings.params.radius * 3;
					let genome = this.fe.makeFlower(this.settings.params.radius, this.settings.params.numLayers, 
													this.settings.params.P, this.settings.params.bias);
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
		async deleteLocalFlower(id){
			await this.db.favourites.delete(id)
				.catch(e => this.errors.push({message: e}));
			await this.db.descendants.delete(id)
				.catch(e => this.errors.push({message: e}));
			await this.db.flowers.delete(id)
				.catch(e => this.errors.push({message: e}));
// @todo fix mutations error when deleting
//			await this.db.mutations.where("original").equals(id).or("id").equals(id).delete()
//				.catch(e => this.errors.push({message: e}));
			this.localFlowers = this.localFlowers.filter(f => f.id != id);
			this.favourites = this.favourites.filter(f => f.id != id);
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
				const flowers = await this.db.flowers.reverse().limit(limit).offset(offset).toArray();
				this.localFlowers = this.localFlowers.concat(flowers);
			}catch(e){
				//this.errors.push({message:e});
			}
		},
		async updateLastAdded({limit, offset}){
			try{
				const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
				this.lastAdded = response.data.flowers;
			}catch(e){
				//this.errors.push({message:e});
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
				this.mutations = [];
				const mutations = await this.db.mutations.where("original")
									.equals(flower.id).limit(limit).offset(offset).toArray();
				for(const m of mutations){
					this.db.flowers.get(m.id).then((f) => {
						this.mutations.unshift(f);
					});
				}
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
				const mutations = await this.db.mutations.where("original")
											.equals(flower.id).limit(limit)
											.offset(offset).toArray();
				for(const m of mutations){
					this.db.flowers.get(m.id).then((f) => {
						this.mutations.unshift(f);
					});
				}
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
				//this.errors.push({message:e});
			}
		},
		async updateLocalAncestors({flower1, flower2, limit, offset}){
			try{
				this.ancestors = [];
				if(flower2 === undefined || flower2 === null){
					const descendants = await this.db.descendants.where("father")
											.equals(flower1.id).limit(limit)
											.offset(offset).toArray();
					for(const d of descendants){
						this.db.flowers.get(d.id).toArray()
							.then((f) => {
								this.ancestors.unshift(f);
						});
					}
				}else{
					const descendants = await this.db.descendants.where("father").equals(flower1.id)
						.and(ds => ds.mother == flower2.id).limit(limit).offset(offset).toArray();
					for(const d of descendants){
						this.db.flowers.get(d.id).toArray()
							.then((f) => {
								this.ancestors.unshift(f);
						});
					}
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
			// @todo fix
			try{
				if(flower2 === undefined || flower2 === null){
					const descendants = await this.db.descendants.where("father").equals(flower1.id)
											.limit(limit).offset(offset).toArray();
					for(const d of descendants){
						this.db.flowers.get(d.id).toArray()
							.then((f) => {
								this.ancestors.unshift(f);
						});
					}
				}else{
					const descendants = await this.db.descendants.where("father").equals(flower1.id)
						.and(ds => ds.mother == flower2.id).limit(limit).offset(offset).toArray();
					for(const d of descendants){
						this.db.flowers.get(d.id).toArray()
							.then((f) => {
								this.ancestors.unshift(f);
						});
					}
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
					let f1 = await this.db.flowers.get(this.localSelected.flowers[0]);
					let f2 = await this.db.flowers.get(this.localSelected.flowers[1]);
					this.canvas.width = this.settings.params.radius * 2;
					this.canvas.height = this.settings.params.radius * 3;
					let genome = this.fe.reproduce(f1.genome, 
													f2.genome,
													this.settings.params.radius, this.settings.params.numLayers, 
													this.settings.params.P, this.settings.params.bias);
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
					this.canvas.width = this.settings.params.radius * 2;
					this.canvas.height = this.settings.params.radius * 3;
					let genome = this.fe.mutate(flower.genome, 
													this.settings.params.radius, this.settings.params.numLayers, 
													this.settings.params.P, this.settings.params.bias,
													this.settings.mutationRates.addNodeRate, 
													this.settings.mutationRates.addConnRate, 
													this.settings.mutationRates.removeConnRate, 
													this.settings.mutationRates.perturbWeightsRate, 
													this.settings.mutationRates.enableRate, 
													this.settings.mutationRates.disableRate, 
													this.settings.mutationRates.actTypeRate
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
					this.mutations.unshift(f);
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
