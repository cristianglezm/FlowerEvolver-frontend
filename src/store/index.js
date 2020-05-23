import Vue from 'vue';
import Vuex from 'vuex';

import { mutations, STORAGE_KEY } from './mutations';
import actions from './actions';
import plugins from './plugins';

Vue.use(Vuex);

export default new Vuex.Store({
    state:{
        flowers: JSON.parse('[]'),
        lastAdded: JSON.parse('[]'),
        selected: {index: 0, flowers: []},
        favourites: JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]'),
    },
    actions,
    mutations,
    plugins
})