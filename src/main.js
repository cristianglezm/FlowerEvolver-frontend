import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { useFlowerStore} from './stores/FlowerStore';
import router from './router';
import App from './App.vue';
import mitt from 'mitt';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
const FlowerStore = useFlowerStore(pinia);
// this will load the FlowerEvolver WASM module into state.fe
FlowerStore.loadFE();
app.use(FlowerStore);
app.config.globalProperties.$store = FlowerStore;
app.use(router);
const emitter = mitt();
app.config.globalProperties.$emitter = emitter;
// steps towards composition api
app.provide('appStore', FlowerStore);
app.provide('emitter', emitter);
app.mount('#app');
