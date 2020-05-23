export const STORAGE_KEY = 'FlowerEvolver';

export const mutations = {
    addFlower(state, flower){
        state.flowers.push(flower);
    },
    addFlowerToFav(state, flower){
        state.favourites.push(flower);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favourites))
    },
    removeFlowerFromFav(state, flower){
        state.favourites.splice(state.favourites.indexOf(flower),1);
        console.log(state.favourites);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favourites));
    },
    selectFlower(state, flower){
        state.selected.flowers[state.selected.index] = flower.id;
        state.selected.index++;
        if(state.selected.index > 1){
            state.selected.index = 0;
        }
    },
}