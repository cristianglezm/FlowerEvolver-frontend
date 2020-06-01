export const getters = {
    getSelected: (state) => {
        return state.selected.flowers;
    },
    isFlowerSelected: (state) => (flower) => {
        if(state.selected.flowers.length > 1)
            return (flower.id === state.selected.flowers[0] || flower.id === state.selected.flowers[1]);
        return false;
    },
    getFlowers: (state) => () => {
        return state.flowers;
    },
    getMutations: (state) => () => {
        return state.mutations;
    },
    getAncestors: (state) => () => {
        return state.ancestors;
    },
}