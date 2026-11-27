import { defineStore } from 'pinia';
import * as flowerRepository from '../../repositories/flowerRepository';
import { useErrorStore } from '../ErrorStore';
import { flowerAdded, flowerRemoved } from '../../services/listEvents';

// The favourites are in the table of the repository, and the views that list them are told about the changes
// (see listEvents.js), so there is no state here.
export const useFavouritesStore = defineStore('FavouritesStore', {
	actions: {
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
							flowerAdded('favourites', f);
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
			flowerRemoved('favourites', id);
		},
	}
});
