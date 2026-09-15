import { defineStore } from 'pinia';
import { db as ddb } from './db';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { getFlowerEvolver } from '../../services/flowerEvolver';
import * as flowerRepository from '../../services/flowerRepository';
import * as flowerApiClient from '../../services/flowerApiClient';
import { useErrorStore } from '../ErrorStore';

export const API = import.meta.env.VITE_APP_API_URL;
export const URL = import.meta.env.VITE_APP_DOWNLOAD_URL;
export const STORAGE_KEY = 'FlowerEvolverSettings';
export const STORAGE_KEY_GARDEN = "FlowerEvolverGarden";

export const useFlowerStore = defineStore('FlowerStore', {
	state: () => ({
		db: ddb,
		remoteFlowers: [],
		localFlowers: [],
		lastAdded: [],
		mutations: [],
		ancestors: [],
		remoteSelected: { index: 0, flowers: [] },
		localSelected: { index: 0, flowers: [] },
		timer: 0,
		favourites: [],
		settings: JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify({
			params: { radius:64, numLayers:3, P: 6.0, bias: 1.0 },
			mutationRates: { addNodeRate: 0.2, addConnRate: 0.3, removeConnRate: 0.2, perturbWeightsRate: 0.6, enableRate: 0.35, disableRate: 0.3, actTypeRate: 0.4 },
			loadDemoFlowers: true,
			loadCaptionerModel: false,
			loadChatBotModel: false,
			loadKokoroModel: false,
			showChatBot: false,
			pagination: false,
			limit: 100,
			magnification: 4
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
		getRemoteFlowers: (state) => {
			return state.remoteFlowers;
		},
		getLocalFlowers: (state) => {
			return state.localFlowers;
		},
		getMutations: (state) => {
			return state.mutations;
		},
		getAncestors: (state) => {
			return state.ancestors;
		}
	},
	actions: {
		increaseOffset(offset){
			return offset + this.settings.limit;
		},
		calcOffset(page){
			return page * this.settings.limit;
		},
		async getRemoteFlowersCount(){
			try{
				return await flowerApiClient.getFlowersCount();
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
			return 0;
		},
		async getLocalFlowersCount(){
			return await flowerRepository.countFlowers();
		},
		async getFavouritesCount(){
			return await flowerRepository.countFavourites();
		},
		async getRemoteMutationsCount(original){
			try{
				return await flowerApiClient.getMutationsCount(original);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
			return 0;
		},
		async getLocalMutationsCount(original){
			return await flowerRepository.countMutations(original);
		},
		async getRemoteAncestorsCount(fatherID, motherID){
			try{
				return await flowerApiClient.getAncestorsCount(fatherID, motherID);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async getLocalAncestorsCount(fatherID, motherID){
			if(motherID === undefined || motherID === null){
				return flowerRepository.countDescendantsByParent(fatherID);
			}else{
				return flowerRepository.countDescendantsByParents(fatherID, motherID);
			}
		},
		async setLoadDemoFlowers(load){
			this.settings.loadDemoFlowers = load;
			this.saveSettings();
		},
		async saveSettings(){
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
		},
		async addRemoteFlowerToLocal(flower){
			try{
				fetch(URL + flower.genome)
				.then(response => {
					return response.text();
				})
				.then(async (genome) => {
					flowerRepository.ensureOpen();
					let localFlower;
					try{
						const fe = await getFlowerEvolver();
						fe.setParams(new FEParams(this.settings.params.radius, this.settings.params.numLayers, 
							this.settings.params.P, this.settings.params.bias));
						localFlower = await fe.drawFlower(genome);
					}catch(e){
						const ErrorStore = useErrorStore();
						ErrorStore.push(e);
						return;
					}
					let f = {
						genome: localFlower.genome,
						image: localFlower.image
					};
					flowerRepository.addFlower(f)
					.then((id) => {
						f.id = id;
						this.localFlowers.unshift(f);
					}).catch(e => {
						const ErrorStore = useErrorStore();
						ErrorStore.push(e);
					});
				});
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async isFavourited(id){
			try{
				return await flowerRepository.isFavourited(id);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async addFlowerToFav(id){
			flowerRepository.addFavourite(id)
				.then(ID => {
					flowerRepository.getFlower(ID)
						.then((f) => {
							this.favourites.unshift(f);
						})
						.catch(e => {
							const ErrorStore = useErrorStore();
							ErrorStore.push(e);
						});
				})
				.catch(e => {
					const ErrorStore = useErrorStore();
					ErrorStore.push(e);
				});
		},
		removeFlowerFromFav(id){
			flowerRepository.removeFavourite(id);
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
				this.remoteFlowers = await flowerApiClient.getFlowers({limit, offset});
			}catch(_){
				//const ErrorStore = useErrorStore();
				//ErrorStore.push(_);
			}
		},
		async updateLocalFlowers({limit, offset}){
			try{
				const flowers = await flowerRepository.listFlowers({limit, offset});
				this.localFlowers = flowers;
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async updateAndConcatRemoteFlowers({limit, offset}){
			try{
				const flowers = await flowerApiClient.getFlowers({limit, offset});
				this.remoteFlowers = this.remoteFlowers.concat(flowers);
			}catch(_){
				//const ErrorStore = useErrorStore();
				//ErrorStore.push(e);
			}
		},
		async updateAndConcatLocalFlowers({limit, offset}){
			try{
				const flowers = await flowerRepository.listFlowers({limit, offset});
				this.localFlowers = this.localFlowers.concat(flowers);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async updateLastAdded({limit, offset}){
			try{
				this.lastAdded = await flowerApiClient.getFlowers({limit, offset});
			}catch(_){
				//const ErrorStore = useErrorStore();
				//ErrorStore.push(e);
			}
		},
		async updateRemoteMutations({flower, limit, offset}){
			try{
				this.mutations = await flowerApiClient.getMutations(flower.id, {limit, offset});
			}catch(_){
				//const ErrorStore = useErrorStore();
				//ErrorStore.push(_);
			}
		},
		async updateLocalMutations({flower, limit, offset}){
			try{
				this.mutations = [];
				const mutations = await flowerRepository.listMutationsByOriginal({original: flower.id, limit, offset});
				for(const m of mutations){
					flowerRepository.getFlower(m.id).then((f) => {
						this.mutations.push(f);
					});
				}
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async updateAndConcatRemoteMutations({flower, limit, offset}){
			try{
				const mutations = await flowerApiClient.getMutations(flower.id, {limit, offset});
				this.mutations = this.mutations.concat(mutations);
			}catch(_){
				//const ErrorStore = useErrorStore();
				//ErrorStore.push(_);
			}
		},
		async updateAndConcatLocalMutations({flower, limit, offset}){
			try{
				const mutations = await flowerRepository.listMutationsByOriginal({original: flower.id, limit, offset});
				for(const m of mutations){
					flowerRepository.getFlower(m.id).then((f) => {
						this.mutations.push(f);
					});
				}
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async updateRemoteAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					this.ancestors = await flowerApiClient.getAncestors(flower1.id, undefined, {limit, offset});
				}else{
					this.ancestors = await flowerApiClient.getAncestors(flower1.id, flower2.id, {limit, offset});
				}
			}catch(_){
				//const ErrorStore = useErrorStore();
				//ErrorStore.push(_);
			}
		},
		async updateLocalAncestors({flower1, flower2, limit, offset}){
			try{
				this.ancestors = [];
				if(flower2 === undefined || flower2 === null){
					const descendants = await flowerRepository.listDescendantsByParent({fatherID: flower1.id, limit, offset});
					for(const d of descendants){
						flowerRepository.getFlower(d.id)
							.then((f) => {
								this.ancestors.push(f);
						});
					}
				}else{
					const descendants = await flowerRepository.listDescendantsByParents({fatherID: flower1.id, motherID: flower2.id, limit, offset});
					for(const d of descendants){
						flowerRepository.getFlower(d.id)
							.then((f) => {
								this.ancestors.push(f);
						});
					}
				}
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async updateAndConcatRemoteAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					const ancestors = await flowerApiClient.getAncestors(flower1.id, undefined, {limit, offset});
					this.ancestors = this.ancestors.concat(ancestors);
				}else{
					const ancestors = await flowerApiClient.getAncestors(flower1.id, flower2.id, {limit, offset});
					this.ancestors = this.ancestors.concat(ancestors);
				}
			}catch(_){
				//const ErrorStore = useErrorStore();
				//ErrorStore.push(_);
			}
		},
		async updateAndConcatLocalAncestors({flower1, flower2, limit, offset}){
			try{
				if(flower2 === undefined || flower2 === null){
					const descendants = await flowerRepository.listDescendantsByParent({fatherID: flower1.id, limit, offset});
					for(const d of descendants){
						flowerRepository.getFlower(d.id)
							.then((f) => {
								this.ancestors.push(f);
						});
					}
				}else{
					const descendants = await flowerRepository.listDescendantsByParents({fatherID: flower1.id, motherID: flower2.id, limit, offset});
					for(const d of descendants){
						flowerRepository.getFlower(d.id)
							.then((f) => {
								this.ancestors.push(f);
						});
					}
				}
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async shareFlower(genome){
			try{
				await flowerApiClient.shareFlower(genome);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(flowerApiClient.mapAxiosError(e, "cannot share flower, server offline"));
			}
		},
		async makeRemoteFlower(){
			try{
				const flower = await flowerApiClient.createFlower();
				this.remoteFlowers.unshift(flower);
				this.lastAdded.unshift(flower);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(flowerApiClient.mapAxiosError(e, "cannot make a remote flower, server offline"));
			}
		},
		async makeLocalFlower(){
			try{
				flowerRepository.ensureOpen();
				let flower;
				try{
					const fe = await getFlowerEvolver();
					fe.setParams(new FEParams(this.settings.params.radius, this.settings.params.numLayers, 
													this.settings.params.P, this.settings.params.bias));
					flower = await fe.makeFlower();
				}catch(_){
					const ErrorStore = useErrorStore();
					//ErrorStore.push(_);
					ErrorStore.push("couldn't make a local flower");
					return;
				}
				let id = await flowerRepository.addFlower({
					genome: flower.genome,
					image: flower.image
				});
				let f = await flowerRepository.getFlower(id);
				this.localFlowers.unshift(f);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async redrawFlower(flower){
			try{
				flowerRepository.ensureOpen();
				let f;
				try{
					const fe = await getFlowerEvolver();
					fe.setParams(new FEParams(this.settings.params.radius, this.settings.params.numLayers, 
						this.settings.params.P, this.settings.params.bias));
					f = await fe.drawFlower(flower.genome);
				}catch(_){
					const ErrorStore = useErrorStore();
					// ErrorStore.push(_);
					ErrorStore.push("couldn't redraw a local flower.");
					return;
				}
				flower.image = f.image;
				delete flower.id;
				flower.id = await flowerRepository.addFlower(flower)
				.catch(e => {
					const ErrorStore = useErrorStore();
					ErrorStore.push(e);
				});
				this.localFlowers.unshift(flower);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
        async deleteAllFlowers(){
            this.localSelected.flowers = [];
            this.localSelected.index = 0;
            await flowerRepository.wipeDatabase();
			this.localFlowers = []
		},
        async deleteNonFavourites(){
            let ids = await flowerRepository.listFavouriteIds();
            let flowers = await flowerRepository.bulkGetFlowers(ids);
			for(const f of flowers){
				this.localFlowers.unshift(f);
			}
            let descs = await flowerRepository.bulkGetDescriptions(ids);
            for(let id = 0;id < flowers.length; ++id){
                ids[id] = id + 1;
                flowers[id].id = id + 1;
                if(descs[id] !== undefined){
                    descs[id].id = id + 1;
                }
            }
            descs = descs.filter((d) => {
                return d !== undefined;
            });
            this.localSelected.flowers = [];
            this.localSelected.index = 0;
            await flowerRepository.wipeDatabase();
            flowerRepository.bulkAddFlowers(flowers);
            await flowerRepository.bulkAddFavourites(ids);
            await flowerRepository.bulkAddDescriptions(descs);
		},
		async deleteLocalFlower(id){
			this.localSelected.flowers = [];
			this.localSelected.index = 0;
			const handleError = (e) => {
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			};
			await flowerRepository.removeFavourite(id).catch(handleError);
			await flowerRepository.deleteDescription(id).catch(handleError);
			await flowerRepository.deleteDescendant(id).catch(handleError);
			await flowerRepository.deleteFlower(id).catch(handleError);
			flowerRepository.findMutationsByOriginalOrId(id)
				.then((ms) => {
					let ids = ms.map(m => m.id);
					flowerRepository.bulkDeleteMutations(ids).catch(handleError);
				}).catch(handleError);
			this.localFlowers = this.localFlowers.filter(f => f.id != id);
			this.favourites = this.favourites.filter(f => f.id != id);
			this.ancestors = this.ancestors.filter(f => f.id != id);
			this.mutations = this.mutations.filter(f => f.id != id);
		},
		async remoteReproduce(){
			if(this.remoteSelected.flowers.length > 1){
				try{
					const flower = await flowerApiClient.reproduceRemote(this.remoteSelected.flowers[0], this.remoteSelected.flowers[1]);
					this.remoteFlowers.unshift(flower);
					this.lastAdded.unshift(flower);
					this.ancestors.unshift(flower);
				}catch(_){
					const ErrorStore = useErrorStore();
					ErrorStore.push(flowerApiClient.mapAxiosError(_, "cannot reproduce remote flowers, server offline."));
				}
			}else{
				const ErrorStore = useErrorStore();
				ErrorStore.push("There are no flowers selected");
			}
		},
		async localReproduce(){
			if(this.localSelected.flowers.length > 1){
				flowerRepository.ensureOpen();
				let f1 = await flowerRepository.getFlower(this.localSelected.flowers[0]);
				let f2 = await flowerRepository.getFlower(this.localSelected.flowers[1]);
				let flower;
				try{
					const fe = await getFlowerEvolver();
					fe.setParams(new FEParams(this.settings.params.radius, this.settings.params.numLayers, 
						this.settings.params.P, this.settings.params.bias));
					flower = await fe.reproduce(f1.genome, f2.genome);
				}catch(_){
					const ErrorStore = useErrorStore();
					//ErrorStore.push(_);
					ErrorStore.push("couldn't reproduce some local flowers");
					return;
				}
				let id = await flowerRepository.addFlower({
					genome: flower.genome,
					image: flower.image
				});
				flowerRepository.addDescendant({
					id: id,
					father: f1.id, 
					mother: f2.id
					}).catch(e => {
						const ErrorStore = useErrorStore();
						ErrorStore.push(e);
					});
				let f = await flowerRepository.getFlower(id);
				this.localFlowers.unshift(f);
				this.ancestors.unshift(f);
			}else{
				const ErrorStore = useErrorStore();
				ErrorStore.push("There are no flowers selected.");
			}
		},
		async makeRemoteMutation(flower){
			try{
				const mutation = await flowerApiClient.mutateRemote(flower.id);
				this.remoteFlowers.unshift(mutation);
				this.lastAdded.unshift(mutation);
				this.mutations.unshift(mutation);
			}catch(_){
				const ErrorStore = useErrorStore();
				ErrorStore.push(flowerApiClient.mapAxiosError(_, "cannot mutate a remote flower, server offline."));
			}
		},
		async makeLocalMutation(original){
			try{
				flowerRepository.ensureOpen();
				let flower;
				try{
					const fe = await getFlowerEvolver();
					fe.setParams(new FEParams(this.settings.params.radius, this.settings.params.numLayers, 
						this.settings.params.P, this.settings.params.bias));
					flower = await fe.mutate(original.genome, 
                                                this.settings.mutationRates.addNodeRate, 
                                                this.settings.mutationRates.addConnRate, 
                                                this.settings.mutationRates.removeConnRate, 
                                                this.settings.mutationRates.perturbWeightsRate, 
                                                this.settings.mutationRates.enableRate, 
                                                this.settings.mutationRates.disableRate, 
                                                this.settings.mutationRates.actTypeRate
                                            );
				}catch(_){
					const ErrorStore = useErrorStore();
					//ErrorStore.push(_);
					ErrorStore.push("couldn't mutate a local flower.");
					return;
				}
				let id = await flowerRepository.addFlower({
					genome: flower.genome, 
					image: flower.image
				});
				flowerRepository.addMutation({
					id: id, 
					original: original.id
				}).catch(e => {
					const ErrorStore = useErrorStore();
					ErrorStore.push(e);
				});
				let f = await flowerRepository.getFlower(id);
				this.localFlowers.unshift(f);
				this.mutations.unshift(f);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
	},
});
