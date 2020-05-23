import VueRouter from 'vue-router';

import Flower from '../components/Flower.vue';
import LastAdded from '../views/LastAdded.vue';
import Browse from '../views/Browse.vue';
import Favourites from '../views/Favourites.vue';
import Downloads from '../views/Downloads.vue';

export default new VueRouter({
    mode: 'history',
    base: __dirname,
    routes: [
        { path: '/', name: 'default', component: LastAdded },
        { path: '/LastAdded', name: 'LastAdded', component: LastAdded },
        { path: '/Browse', name: 'Browse', component: Browse },
        { path: '/Favourites', name: 'Favourites', component: Favourites },
        { path: '/Downloads', name: 'Downloads', component: Downloads },
        { path: '/Flower/:id', name: 'Flower', component: Flower },
    ]
})