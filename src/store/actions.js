export default{
    selectFlower({commit}, flower){
        commit('selectFlower', flower);
    },
    addFlowerToFav({commit}, flower){
        commit('addFlowerToFav', flower);
    },
    removeFlowerFromFav({commit}, flower){
        commit('removeFlowerFromFav', flower);
    },
    makeFlower({commit}){
        commit('makeFlower');
    },
    updateFlowers({commit}, {limit, offset}){
        commit('updateFlowers',{limit, offset});
    },
    updateAndConcatFlowers({commit}, {limit, offset}){
        commit('updateAndConcatFlowers',{limit, offset});
    },
    updateMutations({commit}, {flower, limit, offset}){
        commit('updateMutations',{flower, limit, offset});
    },
    updateAndConcatMutations({commit}, {flower, limit, offset}){
        commit('updateAndConcatMutations',{flower, limit, offset});
    },
    updateAncestors({commit}, {flower1, flower2, limit, offset}){
        commit('updateAncestors',{flower1, flower2, limit, offset});
    },
    updateAndConcatAncestors({commit}, {flower1, flower2, limit, offset}){
        commit('updateAndConcatAncestors',{flower1, flower2, limit, offset});
    },
    updateLastAdded({commit}, {limit, offset}){
        commit('updateLastAdded',{limit, offset});
    },
    reproduce({commit}){
        commit('reproduce');
    },
    makeMutation({commit}, flower){
        commit('makeMutation', flower);
    },
}