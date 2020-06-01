import Vue from 'vue';
import Vuex from 'vuex';

import { mutations, STORAGE_KEY } from './mutations';
import { getters } from './getters';
import actions from './actions';
import plugins from './plugins';

Vue.use(Vuex);

export default new Vuex.Store({
    state:{
        flowers: JSON.parse('[]'),
        lastAdded: JSON.parse('[]'),
        mutations: JSON.parse('[]'),
        ancestors: JSON.parse('[]'),
        errors: JSON.parse('[]'),
        selected: {index: 0, flowers: []},
        query: {limit:28, offset:0},
        timer: 0,
        favourites: JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]'),
    },
    getters,
    actions,
    mutations,
    plugins
})