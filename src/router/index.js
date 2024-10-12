import { createRouter, createWebHashHistory } from 'vue-router';

import Local from '../views/Local.vue';
import LastAdded from '../views/LastAdded.vue';
import Mutations from '../views/Mutations.vue';
import Ancestors from '../views/Ancestors.vue';
import Browse from '../views/Browse.vue';
import Favourites from '../views/Favourites.vue';
import Downloads from '../views/Downloads.vue';
import Settings from '../views/Settings.vue';

const routes = [
  { path: '/', redirect: 'LastAdded' },
  { path: '/Local', name: 'Local', component: Local },
  { path: '/LastAdded', name: 'LastAdded', component: LastAdded },
  { path: '/Browse', name: 'Browse', component: Browse },
  { path: '/Favourites', name: 'Favourites', component: Favourites },
  { path: '/Downloads', name: 'Downloads', component: Downloads },
  { path: '/Settings', name: 'Settings', component: Settings },
  { path: '/Mutations/:isLocal/:id', name: 'Mutations', component: Mutations },
  {
    path: '/Descendants/:isLocal/:father/:mother',
    name: 'DescendantsFatherAndMother',
    component: Ancestors,
  },
  {
    path: '/Descendants/:isLocal/:father',
    name: 'DescendantsFatherOrMother',
    component: Ancestors,
  },
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;

