import { defineStore } from 'pinia';
import { FEParams } from '@cristianglezm/flower-evolver-wasm';
import { getFlowerEvolver, keptPetals } from '../../services/flowerEvolver';
import * as flowerRepository from '../../repositories/flowerRepository';
import * as speciesRepository from '../../repositories/speciesRepository';
import { useErrorStore } from '../ErrorStore';
import { useSpeciesStore } from '../SpeciesStore';
import { useSettingsStore } from '../SettingsStore';
import { flowerAdded, flowerRemoved, listReset } from '../../services/listEvents';

export const URL = import.meta.env.VITE_APP_DOWNLOAD_URL;

export const useLocalFlowerStore = defineStore('LocalFlowerStore', {
	state: () => ({
		localSelected: { index: 0, flowers: [] },
	}),
	getters: {
		getLocalSelected: (state) => {
			return state.localSelected.flowers;
		},
		isLocalFlowerSelected: (state) => (flower) => {
			if(state.localSelected.flowers.length > 1)
				return (flower.id === state.localSelected.flowers[0] || flower.id === state.localSelected.flowers[1]);
			return false;
		},
	},
	actions: {
		async addRemoteFlowerToLocal(flower){
			const settings = useSettingsStore().settings;
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
						fe.setParams(new FEParams(settings.params.radius, settings.params.numLayers,
							settings.params.P, settings.params.bias));
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
						flowerAdded('local', f);
						useSpeciesStore().classifyLater(id);
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
		// The genome drawn with other params than the ones of the settings, for the editor of the params of a flower: the
		// genome with those params in its petals, its image, and the params. The wasm keeps the params it is given in its
		// limits and says which it kept in the petals of what it makes, so those are what is drawn and what the genome
		// has, not what was typed. The evolver is left with the params that it had, nothing here is for the settings.
		async drawFlowerWithParams(genome, params){
			const kept = await keptPetals(params);
			const fe = await getFlowerEvolver();
			const before = fe.getParams();
			try{
				fe.setParams(new FEParams(kept.radius, kept.numLayers, kept.P, kept.bias));
				const edited = JSON.parse(genome);
				edited.Flower.petals = kept;
				const editedGenome = JSON.stringify(edited);
				const drawn = await fe.drawFlower(editedGenome);
				return { genome: editedGenome, image: drawn.image, params: kept };
			}finally{
				if(before){
					fe.setParams(before);
				}
			}
		},
		// The flower with other params, as a new flower of the browser: the one that it comes from is left as it is.
		async addFlowerWithParams(genome, params){
			try{
				flowerRepository.ensureOpen();
				let drawn;
				try{
					drawn = await this.drawFlowerWithParams(genome, params);
				}catch(_){
					const ErrorStore = useErrorStore();
					ErrorStore.push("couldn't draw the flower with those params.");
					return undefined;
				}
				const flower = { genome: drawn.genome, image: drawn.image };
				flower.id = await flowerRepository.addFlower(flower)
				.catch(e => {
					const ErrorStore = useErrorStore();
					ErrorStore.push(e);
				});
				// without an id it was not stored, and a flower that is not in the table is not for the list
				if(flower.id === undefined){
					return undefined;
				}
				flowerAdded('local', flower);
				useSpeciesStore().classifyLater(flower.id);
				return flower;
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
				return undefined;
			}
		},
		selectLocalFlower(flower){
			this.localSelected.flowers[this.localSelected.index] = flower.id;
			this.localSelected.index++;
			if(this.localSelected.index > 1){
				this.localSelected.index = 0;
			}
		},
		async makeLocalFlower(){
			const settings = useSettingsStore().settings;
			try{
				flowerRepository.ensureOpen();
				let flower;
				try{
					const fe = await getFlowerEvolver();
					fe.setParams(new FEParams(settings.params.radius, settings.params.numLayers,
													settings.params.P, settings.params.bias));
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
				flowerAdded('local', f);
				useSpeciesStore().classifyLater(id);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
		async redrawFlower(flower){
			const settings = useSettingsStore().settings;
			try{
				flowerRepository.ensureOpen();
				let f;
				try{
					const fe = await getFlowerEvolver();
					fe.setParams(new FEParams(settings.params.radius, settings.params.numLayers,
						settings.params.P, settings.params.bias));
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
				// without an id it was not stored, and a flower that is not in the table is not for the list
				if(flower.id !== undefined){
					flowerAdded('local', flower);
					useSpeciesStore().classifyLater(flower.id);
				}
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
        async deleteAllFlowers(){
            this.localSelected.flowers = [];
            this.localSelected.index = 0;
            await flowerRepository.wipeDatabase();
			useSpeciesStore().invalidate();
			listReset('local');
			listReset('favourites');
			listReset('localMutations');
			listReset('localDescendants');
		},
        async deleteNonFavourites(){
            let ids = await flowerRepository.listFavouriteIds();
            let flowers = await flowerRepository.bulkGetFlowers(ids);
            let descs = await flowerRepository.bulkGetDescriptions(ids);
            let species = await speciesRepository.bulkGetSpecies(ids);
            for(let id = 0;id < flowers.length; ++id){
                ids[id] = id + 1;
                flowers[id].id = id + 1;
                if(descs[id] !== undefined){
                    descs[id].id = id + 1;
                }
                if(species[id] !== undefined){
                    species[id].id = id + 1;
                }
            }
            descs = descs.filter((d) => {
                return d !== undefined;
            });
            species = species.filter((s) => {
                return s !== undefined;
            });
            this.localSelected.flowers = [];
            this.localSelected.index = 0;
            await flowerRepository.wipeDatabase();
            await flowerRepository.bulkAddFlowers(flowers);
            await flowerRepository.bulkAddFavourites(ids);
            await flowerRepository.bulkAddDescriptions(descs);
            await speciesRepository.bulkPutSpecies(species);
            useSpeciesStore().invalidate();
			// the tables were written again with other ids: whoever shows the flowers reads them again
			listReset('local');
			listReset('favourites');
			listReset('localMutations');
			listReset('localDescendants');
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
			await useSpeciesStore().removeFlower(id).catch(handleError);
			await flowerRepository.deleteFlower(id).catch(handleError);
			flowerRepository.findMutationsByOriginalOrId(id)
				.then((ms) => {
					let ids = ms.map(m => m.id);
					flowerRepository.bulkDeleteMutations(ids).catch(handleError);
				}).catch(handleError);
			flowerRemoved('local', id);
			flowerRemoved('favourites', id);
			flowerRemoved('localDescendants', id);
			flowerRemoved('localMutations', id);
		},
		async localReproduce(){
			const settings = useSettingsStore().settings;
			if(this.localSelected.flowers.length > 1){
				flowerRepository.ensureOpen();
				let f1 = await flowerRepository.getFlower(this.localSelected.flowers[0]);
				let f2 = await flowerRepository.getFlower(this.localSelected.flowers[1]);
				let flower;
				try{
					const fe = await getFlowerEvolver();
					fe.setParams(new FEParams(settings.params.radius, settings.params.numLayers,
						settings.params.P, settings.params.bias));
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
				flowerAdded('local', f);
				// the first of the two selected is the father and the second the mother, the lists of descendants
				// are made of the children of that pair
				flowerAdded('localDescendants', f, { father: f1.id, mother: f2.id });
				useSpeciesStore().classifyLater(id);
			}else{
				const ErrorStore = useErrorStore();
				ErrorStore.push("There are no flowers selected.");
			}
		},
		async makeLocalMutation(original){
			const settings = useSettingsStore().settings;
			try{
				flowerRepository.ensureOpen();
				let flower;
				try{
					const fe = await getFlowerEvolver();
					fe.setParams(new FEParams(settings.params.radius, settings.params.numLayers,
						settings.params.P, settings.params.bias));
					flower = await fe.mutate(original.genome, 
                                                settings.mutationRates.addNodeRate,
                                                settings.mutationRates.addConnRate,
                                                settings.mutationRates.removeConnRate,
                                                settings.mutationRates.perturbWeightsRate,
                                                settings.mutationRates.enableRate,
                                                settings.mutationRates.disableRate,
                                                settings.mutationRates.actTypeRate
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
				flowerAdded('local', f);
				flowerAdded('localMutations', f, { original: original.id });
				useSpeciesStore().classifyLater(id);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(e);
			}
		},
	},
});
