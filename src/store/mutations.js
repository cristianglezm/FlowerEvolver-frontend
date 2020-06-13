import axios from 'axios';
var API = process.env.VUE_APP_API_URL;
export const STORAGE_KEY = 'FlowerEvolver';

export const mutations = {
    addFlowerToFav(state, flower){
        state.favourites.push(flower);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favourites))
    },
    removeFlowerFromFav(state, flower){
        state.favourites = state.favourites.filter(
            function(value){
                return value.id !== flower.id;
        }.bind(this));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favourites));
    },
    selectFlower(state, flower){
        state.selected.flowers[state.selected.index] = flower.id;
        state.selected.index++;
        if(state.selected.index > 1){
            state.selected.index = 0;
        }
    },
    async makeFlower(state){
        await axios.post(API + 'flowers',{})
        .then(response => {
            state.flowers.unshift(response.data);
            state.lastAdded.unshift(response.data);
        })
        .catch(e => {
            state.errors.push({message:e});
        });
    },
    async updateFlowers(state, {limit, offset}){
        try{
            const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
            state.flowers = response.data.flowers;
        }catch(e){
            state.errors.push({message:e});
        }
    },
    async updateAndConcatFlowers(state, {limit, offset}){
        try{
            const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
            state.flowers = state.flowers.concat(response.data.flowers);
        }catch(e){
            state.errors.push({message:e});
        }
    },
    async updateLastAdded(state, {limit, offset}){
        try{
            const response = await axios.get(API + 'flowers?limit=' + limit + '&offset=' + offset)
            state.lastAdded = response.data.flowers;
        }catch(e){
            state.errors.push({message:e});
        }
    },
    async updateMutations(state, {flower, limit, offset}){
        try{
            const response = await axios.get(API + 'mutations/' + flower.id + '?limit=' + limit + '&offset=' + offset)
            state.mutations = response.data;
        }catch(e){
            //state.errors.push({message:e});
        }
    },
    async updateAndConcatMutations(state, {flower, limit, offset}){
        try{
            const response = await axios.get(API + 'mutations/' + flower.id +'?limit=' + limit + '&offset=' + offset)
            state.mutations = state.mutations.concat(response.data);
        }catch(e){
            //state.errors.push({message:e});
        }
    },
    async updateAncestors(state, {flower1, flower2, limit, offset}){
        try{            
            if(flower2 === undefined || flower2 === null){
                const response = await axios.get(API + 'ancestors/' + flower1.id + '?limit=' + limit + '&offset=' + offset)
                state.ancestors = response.data;
            }else{
                const response = await axios.get(API + 'ancestors/' + flower1.id + '/' + flower2.id + '?limit=' + limit + '&offset=' + offset)
                state.ancestors = response.data;
            }
        }catch(e){
            //state.errors.push({message:e});
        }
    },
    async updateAndConcatAncestors(state, {flower1, flower2, limit, offset}){
        try{
            if(flower2 === undefined || flower2 === null){
                const response = await axios.get(API + 'ancestors/' + flower1.id + '?limit=' + limit + '&offset=' + offset)
                state.ancestors = state.ancestors.concat(response.data);
            }else{
                const response = await axios.get(API + 'ancestors/' + flower1.id + '/' + flower2.id + '?limit=' + limit + '&offset=' + offset)
                state.ancestors = state.ancestors.concat(response.data);
            }
        }catch(e){
            //state.errors.push({message:e});
        }
    },
    reproduce(state){
        if(state.selected.flowers.length > 1){
            var postData = { father: state.selected.flowers[0], mother: state.selected.flowers[1]}
            axios.post(API + 'ancestors', postData)
            .then(response => {
                state.flowers.unshift(response.data);
                state.lastAdded.unshift(response.data);
                state.ancestors.unshift(response.data);
            })
            .catch(e => {
                state.errors.push({message:e});
            });
        }else{
            state.errors.push({message:"There are no flowers selected"});
        }
    },
    async makeMutation(state, flower){
        await axios.post(API + 'mutations', {original:flower.id})
        .then(response => {
            state.flowers.unshift(response.data);
            state.lastAdded.unshift(response.data);
            state.mutations.unshift(response.data);
        })
        .catch(e => {
            state.errors.push({message:e});
        });
    },
}