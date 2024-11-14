import { defineStore } from 'pinia';
import { db as ddb } from './db';
import axios from 'axios';
import fe from '@cristianglezm/flower-evolver-wasm';

export const API = import.meta.env.VITE_APP_API_URL;
export const URL = import.meta.env.VITE_APP_DOWNLOAD_URL;
export const STORAGE_KEY = 'FlowerEvolverSettings';
export const STORAGE_KEY_GARDEN = "FlowerEvolverGarden";

export const useFlowerStore = defineStore('FlowerStore', {
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
			loadModel: false,
			pagination: false,
			limit: 100
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
			this.fe = await fe();
		},
		increaseOffset(offset){
			return offset + this.settings.limit;
		},
		calcOffset(page){
			return page * this.settings.limit;
		},
		async getRemoteFlowersCount(){
			try{
				const response = await axios.get(API + 'flowers?count=1');
				return response.data.count;
			}catch(e){
				this.errors.push({message: e});
			}
			return 0;
		},
		async getLocalFlowersCount(){
			return await this.db.flowers.count();
		},
		async getFavouritesCount(){
			return await this.db.favourites.count();
		},
		async getRemoteMutationsCount(original){
			try{
				if(original === undefined || original === null){
					const response = await axios.get(API + 'mutations?count=1');
					return response.data.count;
				}else{
					const response = await axios.get(API + 'mutations/' + original + '?count=1');
					return response.data.count;
				}
			}catch(e){
				this.errors.push({message: e});
			}
			return 0;
		},
		async getLocalMutationsCount(original){
			if(original === undefined || original === null){
				return await this.db.mutations.count();
			}else{
				return await this.db.mutations.where("original").equals(original).count();
			}
		},
		async getRemoteAncestorsCount(fatherID, motherID){
			try{
				if(motherID == undefined || motherID == null){
					const response = await axios.get(API + 'ancestors/' + fatherID + '?count=1');
					return response.data.count;
				}else{
					const response = await axios.get(API + 'ancestors/' + fatherID + '/' + motherID + '?count=1');
					return response.data.count;
				}
			}catch(e){
				this.errors.push({message: e});
			}
		},
		async getLocalAncestorsCount(fatherID, motherID){
			if(motherID === undefined || motherID === null){
				return this.db.descendants.where("father").equals(fatherID).or("mother").equals(fatherID).count();
			}else{
				return this.db.descendants.where("father").equals(fatherID).and(d => d.mother == motherID).count();
			}
		},
		setLoadDemoFlowers(load){
			this.settings.loadDemoFlowers = load;
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
		},
		async addRemoteFlowerToLocal(flower){
			try{
				fetch(URL + flower.genome)
				.then(response => {
					return response.text();
				})
				.then(genome => {
					if(this.fe){
						if(!this.db.isOpen()){
							this.db.open();
						}
						this.canvas.width = this.settings.params.radius * 2;
						this.canvas.height = this.settings.params.radius * 3;
						try{
							this.fe.drawFlower(genome, this.settings.params.radius, this.settings.params.numLayers, 
												this.settings.params.P, this.settings.params.bias);
						}catch(e){
							this.errors.push({message: e});
							return;
						}
						let f = {
							genome: genome,
							image: this.getDataURL()
						};
						this.db.flowers.add(f)
						.then((id) => {
							f.id = id;
							this.localFlowers.unshift(f);
						}).catch(e => this.errors.push({message: e}));
					}else{
						this.errors.push({message: "wasm module for flowers is not loaded.(try again)"});
						this.loadFE();
					}
				});
			}catch(e){
				this.errors.push({message: e});
			}
		},
		async isFavourited(id){
			return this.db.favourites.where(":id").equals(id).toArray()
						.then((flowers) => {
							return flowers.length > 0;
						}).catch(e => this.errors.push({message: e}));
		},
		async addFlowerToFav(id){
			this.db.favourites.add(id, id)
				.then(ID => {
					this.db.flowers.get(ID)
						.then((f) => {
							this.favourites.unshift(f);
						})
						.catch(e => this.errors.push({message: e}));
				})
				.catch(e => this.errors.push({message: e}));
		},
		removeFlowerFromFav(id){
			this.db.favourites.where(":id").equals(id).delete();
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
		async updateRemoteFlowers({limit, offset}){
			try{
				const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
				this.remoteFlowers = response.data.flowers;
			}catch(_){
				//this.errors.push({message: _});
			}
		},
		async updateLocalFlowers({limit, offset}){
			try{
				const flowers = await this.db.flowers.reverse().offset(offset).limit(limit).toArray();
				this.localFlowers = flowers;
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateAndConcatRemoteFlowers({limit, offset}){
			try{
				const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
				this.remoteFlowers = this.remoteFlowers.concat(response.data.flowers);
			}catch(_){
				//this.errors.push({message:_});
			}
		},
		async updateAndConcatLocalFlowers({limit, offset}){
			try{
				const flowers = await this.db.flowers.reverse().offset(offset).limit(limit).toArray();
				this.localFlowers = this.localFlowers.concat(flowers);
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async updateLastAdded({limit, offset}){
			try{
				const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
				this.lastAdded = response.data.flowers;
			}catch(_){
				//this.errors.push({message:_});
			}
		},
		async updateRemoteMutations({flower, limit, offset}){
			try{
				const response = await axios.get(API + 'mutations/' + flower.id + '?limit=' + limit + '&offset=' + offset)
				this.mutations = response.data;
			}catch(_){
				//this.errors.push({message:_});
			}
		},
		async updateLocalMutations({flower, limit, offset}){
			try{
				this.mutations = [];
				const mutations = await this.db.mutations.where("original")
									.equals(flower.id).offset(offset).limit(limit).reverse().toArray();
				for(const m of mutations){
					this.db.flowers.get(m.id).then((f) => {
						this.mutations.push(f);
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
			}catch(_){
				//this.errors.push({message:_});
			}
		},
		async updateAndConcatLocalMutations({flower, limit, offset}){
			try{
				const mutations = await this.db.mutations.where("original")
											.equals(flower.id).offset(offset)
											.limit(limit).reverse().toArray();
				for(const m of mutations){
					this.db.flowers.get(m.id).then((f) => {
						this.mutations.push(f);
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
			}catch(_){
				//this.errors.push({message:_});
			}
		},
		async updateLocalAncestors({flower1, flower2, limit, offset}){
			try{
				this.ancestors = [];
				if(flower2 === undefined || flower2 === null){
					const descendants = await this.db.descendants.where("father")
											.equals(flower1.id).or("mother").equals(flower1.id)
											.offset(offset).limit(limit).reverse().toArray();
					for(const d of descendants){
						this.db.flowers.get(d.id)
							.then((f) => {
								this.ancestors.push(f);
						});
					}
				}else{
					const descendants = await this.db.descendants.where("father").equals(flower1.id)
						.and(ds => ds.mother == flower2.id).offset(offset).limit(limit).reverse().toArray();
					for(const d of descendants){
						this.db.flowers.get(d.id)
							.then((f) => {
								this.ancestors.push(f);
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
			}catch(_){
				//this.errors.push({message:_});
			}
		},
		async updateAndConcatLocalAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					const descendants = await this.db.descendants.where("father").equals(flower1.id).or("mother").equals(flower1.id)
											.offset(offset).limit(limit).reverse().toArray();
					for(const d of descendants){
						this.db.flowers.get(d.id)
							.then((f) => {
								this.ancestors.push(f);
						});
					}
				}else{
					const descendants = await this.db.descendants.where("father").equals(flower1.id)
						.and(ds => ds.mother == flower2.id).offset(offset).limit(limit).reverse().toArray();
					for(const d of descendants){
						this.db.flowers.get(d.id)
							.then((f) => {
								this.ancestors.push(f);
						});
					}
				}
			}catch(e){
				this.errors.push({message:e});
			}
		},
		async shareFlower(genome){
		    await axios.post(API + 'flowers', genome, {
				headers: {
					'Content-Type': 'application/json'
				}
			}).catch(_ => {
				if(_.response === undefined){
					this.errors.push({message: "cannot share flower, server offline"});
				}else{
					this.errors.push({message: _.response.data});
				}
		    });
		},
		async makeRemoteFlower(){
			await axios.post(API + 'flowers', {}, {
				headers: {
					'Content-Type': 'application/json'
				}
			}).then(async response => {
				let flower = response.data;
				this.remoteFlowers.unshift(flower);
				this.lastAdded.unshift(flower);
			}).catch(_ => {
				if(_.response === undefined){
					this.errors.push({message: "cannot make a remote flower, server offline."});
				}else{
					this.errors.push({message: _.response.data});
				}
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
					let genome;
					try{
						genome = this.fe.makeFlower(this.settings.params.radius, this.settings.params.numLayers, 
                                                        this.settings.params.P, this.settings.params.bias);
					}catch(_){
						//this.errors.push({message: this.fe.getExceptionMessage(_)});
						this.errors.push({message: "couldn't make a local flower."});
						return;
					}
					let id = await this.db.flowers.add({
						genome: genome,
						image: this.getDataURL()
					});
					let f = await this.db.flowers.get(id);
					this.localFlowers.unshift(f);
				}else{
					this.errors.push({message:"FlowerEvolver WASM module not loaded, try again"});
					this.loadFE();
				}
			}catch(e){
				this.errors.push({message: e});
			}
		},
		async redrawFlower(flower){
			try{
				if(this.fe){
					if(!this.db.isOpen()){
						this.db.open();
					}
					this.canvas.width = this.settings.params.radius * 2;
					this.canvas.height = this.settings.params.radius * 3;
					try{
						this.fe.drawFlower(flower.genome, this.settings.params.radius, this.settings.params.numLayers, 
                                                this.settings.params.P, this.settings.params.bias);
					}catch(_){
						//this.errors.push({message: this.fe.getExceptionMessage(_)});
						this.errors.push({message: "couldn't redraw a local flower."});
						return;
					}
					flower.image = this.getDataURL();
					delete flower.id;
					flower.id = await this.db.flowers.add(flower).catch(e => this.errors.push({message: e}));
					this.localFlowers.unshift(flower);
				}else{
					this.errors.push({message:"FlowerEvolver WASM module not loaded, try again"});
					this.loadFE();
				}
			}catch(e){
				this.errors.push({message: e});
			}
		},
		async deleteLocalFlower(id){
			this.localSelected.flowers = [];
			this.localSelected.index = 0;
			const handleError = (e) => this.errors.push({ message: e });
			await this.db.favourites.delete(id).catch(handleError);
			await this.db.descriptions.delete(id).catch(handleError);
			await this.db.descendants.delete(id).catch(handleError);
			await this.db.flowers.delete(id).catch(handleError);
			this.db.mutations.where("original").equals(id).or(":id").equals(id).toArray()
				.then((ms) => {
					let ids = ms.map(m => m.id);
					this.db.mutations.bulkDelete(ids).catch(handleError);
				}).catch(handleError);
			this.localFlowers = this.localFlowers.filter(f => f.id != id);
			this.favourites = this.favourites.filter(f => f.id != id);
			this.ancestors = this.ancestors.filter(f => f.id != id);
			this.mutations = this.mutations.filter(f => f.id != id);
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
				.catch(_ => {
					if(_.response === undefined){
						this.errors.push({message:"cannot reproduce remote flowers, server offline."});
					}else{
						this.errors.push({message: _.response.data});
					}
				});
			}else{
				this.errors.push({message:"There are no Flowers Selected"});
			}
		},
		async localReproduce(){
			if(this.fe){
				if(this.localSelected.flowers.length > 1){
					if(!this.db.isOpen()){
						this.db.open();
					}
					let f1 = await this.db.flowers.get(this.localSelected.flowers[0]);
					let f2 = await this.db.flowers.get(this.localSelected.flowers[1]);
					this.canvas.width = this.settings.params.radius * 2;
					this.canvas.height = this.settings.params.radius * 3;
					let genome;
					try{
						genome = this.fe.reproduce(f1.genome, f2.genome,
                                                        this.settings.params.radius, this.settings.params.numLayers, 
                                                        this.settings.params.P, this.settings.params.bias);
					}catch(_){
						//this.errors.push({message: this.fe.getExceptionMessage(_)});
						this.errors.push({message: "couldn't reproduce some local flowers."});
						return;
					}
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
					this.ancestors.unshift(f);
				}else{
					this.errors.push({message:"There are no Flowers Selected"});
				}
			}else{
				this.errors.push({message: "WASM module not loaded, try again."});
				this.loadFE();
			}
		},
		async makeRemoteMutation(flower){
			await axios.post(API + 'mutations', {original:flower.id})
			.then(response => {
				this.remoteFlowers.unshift(response.data);
				this.lastAdded.unshift(response.data);
				this.mutations.unshift(response.data);
			})
			.catch(_ => {
				if(_.response === undefined){
					this.errors.push({message:"cannot mutate a remote flower, server offline."});
				}else{
					this.errors.push({message: _.response.data});
				}
			});
		},
		async makeLocalMutation(flower){
			if(this.fe){
				try{
					if(!this.db.isOpen()){
						this.db.open();
					}
					this.canvas.width = this.settings.params.radius * 2;
					this.canvas.height = this.settings.params.radius * 3;
					let genome;
					try{
						genome = this.fe.mutate(flower.genome, 
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
					}catch(_){
						//this.errors.push({message: this.fe.getExceptionMessage(_)});
						this.errors.push({message: "couldn't mutate a local flower."});
						return;
					}
					let id = await this.db.flowers.add({
						genome: genome, 
						image: this.getDataURL()
					});
					this.db.mutations.add({
						id: id, 
						original: flower.id
					}).catch(e => this.errors.push({message: e}));
					let f = await this.db.flowers.get(id);
					this.localFlowers.unshift(f);
					this.mutations.unshift(f);
				}catch(e){
					this.errors.push({message: e});
				}
			}else{
				this.errors.push({message: "WASM module not loaded, try again."});
				this.loadFE();
			}
		},
	},
});
