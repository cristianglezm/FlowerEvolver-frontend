import VueRouter from 'vue-router';

import Demo from '../views/Demo.vue';
import LastAdded from '../views/LastAdded.vue';
import Mutations from '../views/Mutations.vue';
import Ancestors from '../views/Ancestors.vue';
import Browse from '../views/Browse.vue';
import Favourites from '../views/Favourites.vue';
import Downloads from '../views/Downloads.vue';

export default new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        { path: '/', redirect: 'LastAdded'},
        { path: '/Demo', name: 'Demo', component: Demo },
        { path: '/LastAdded', name: 'LastAdded', component: LastAdded },
        { path: '/Browse', name: 'Browse', component: Browse },
        { path: '/Favourites', name: 'Favourites', component: Favourites },
        { path: '/Downloads', name: 'Downloads', component: Downloads },
        { path: '/Mutations/:id', name: 'Mutations', component: Mutations },
        { path: '/Descendants/:father/:mother', name: 'DescendantsFatherAndMother', component: Ancestors },
        { path: '/Descendants/:father', name: 'DescendantsFatherOrMother', component: Ancestors },
    ]
})
