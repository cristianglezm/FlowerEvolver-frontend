import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { useFlowerStore} from './stores/FlowerStore';
import { getFlowerEvolver } from './services/flowerEvolver';
import router from './router';
import App from './App.vue';
import mitt from 'mitt';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
    onNeedRefresh(){
    },
    onOfflineReady(){
    }
});

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(updateSW);
const FlowerStore = useFlowerStore(pinia);
// pre-warm the FlowerEvolver WASM module so it's ready by the time it's first needed
getFlowerEvolver();
app.use(FlowerStore);
app.config.globalProperties.$store = FlowerStore;
app.use(router);
const emitter = mitt();
app.config.globalProperties.$emitter = emitter;
// steps towards composition api
app.provide('appStore', FlowerStore);
app.provide('emitter', emitter);
app.mount('#app');
