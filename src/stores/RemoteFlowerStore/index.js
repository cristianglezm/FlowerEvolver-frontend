import { defineStore } from 'pinia';
import * as flowerApiClient from '../../services/flowerApiClient';
import { useErrorStore } from '../ErrorStore';
import { flowerAdded } from '../../services/listEvents';

// The flowers of the server. The lists that show them are told about what is made here (see listEvents.js), so
// the only state is the pair of flowers that are selected to be reproduced.
export const useRemoteFlowerStore = defineStore('RemoteFlowerStore', {
	state: () => ({
		remoteSelected: { index: 0, flowers: [] },
	}),
	getters: {
		getRemoteSelected: (state) => {
			return state.remoteSelected.flowers;
		},
		isRemoteFlowerSelected: (state) => (flower) => {
			if(state.remoteSelected.flowers.length > 1)
				return (flower.id === state.remoteSelected.flowers[0] || flower.id === state.remoteSelected.flowers[1]);
			return false;
		},
	},
	actions: {
		async getRemoteFlowersCount(){
			try{
				return await flowerApiClient.getFlowersCount();
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(flowerApiClient.describeError(e, "cannot get the remote flowers, server offline"));
			}
			return 0;
		},
		async getRemoteMutationsCount(original){
			try{
				return await flowerApiClient.getMutationsCount(original);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(flowerApiClient.describeError(e, "cannot get the remote mutations, server offline"));
			}
			return 0;
		},
		async getRemoteDescendantsCount(fatherID, motherID){
			try{
				return await flowerApiClient.getDescendantsCount(fatherID, motherID);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(flowerApiClient.describeError(e, "cannot get the remote descendants, server offline"));
				// the pages of a list are counted with it: no number would be NaN pages
				return 0;
			}
		},
		selectRemoteFlower(flower){
			this.remoteSelected.flowers[this.remoteSelected.index] = flower.id;
			this.remoteSelected.index++;
			if(this.remoteSelected.index > 1){
				this.remoteSelected.index = 0;
			}
		},
		async shareFlower(genome){
			try{
				await flowerApiClient.shareFlower(genome);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(flowerApiClient.describeError(e, "cannot share flower, server offline"));
			}
		},
		async makeRemoteFlower(){
			try{
				const flower = await flowerApiClient.createFlower();
				flowerAdded('remote', flower);
				flowerAdded('lastAdded', flower);
			}catch(e){
				const ErrorStore = useErrorStore();
				ErrorStore.push(flowerApiClient.describeError(e, "cannot make a remote flower, server offline"));
			}
		},
		async remoteReproduce(){
			if(this.remoteSelected.flowers.length > 1){
				try{
					const [father, mother] = this.remoteSelected.flowers;
					const flower = await flowerApiClient.reproduceRemote(father, mother);
					flowerAdded('remote', flower);
					flowerAdded('lastAdded', flower);
					flowerAdded('remoteDescendants', flower, { father, mother });
				}catch(_){
					const ErrorStore = useErrorStore();
					ErrorStore.push(flowerApiClient.describeError(_, "cannot reproduce remote flowers, server offline."));
				}
			}else{
				const ErrorStore = useErrorStore();
				ErrorStore.push("There are no flowers selected");
			}
		},
		async makeRemoteMutation(flower){
			try{
				const mutation = await flowerApiClient.mutateRemote(flower.id);
				flowerAdded('remote', mutation);
				flowerAdded('lastAdded', mutation);
				flowerAdded('remoteMutations', mutation, { original: flower.id });
			}catch(_){
				const ErrorStore = useErrorStore();
				ErrorStore.push(flowerApiClient.describeError(_, "cannot mutate a remote flower, server offline."));
			}
		},
	},
});
