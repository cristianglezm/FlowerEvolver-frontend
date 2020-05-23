export default{
    addFlower({commit}, flower){
        commit('addFlower', flower)
    },
    selectFlower({commit}, flower){
        commit('selectFlower', flower)
    },
    addFlowerToFav({commit}, flower){
        commit('addFlowerToFav', flower)
    },
    removeFlowerFromFav({commit}, flower){
        commit('removeFlowerFromFav', flower)
    },
}