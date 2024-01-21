import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { useFlowersStore} from './store';
import router from './router';
import App from './App.vue';
import mitt from 'mitt';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
const store = useFlowersStore(pinia);
// this will load the FlowerEvolver WASM module into state.fe
store.loadFE();
app.use(store);
app.config.globalProperties.$store = store;
app.use(router);
const emitter = mitt();
app.config.globalProperties.$emitter = emitter;
app.mount('#app');

