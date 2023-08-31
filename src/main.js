import { createApp } from 'vue';
import store from './store';
import router from './router';
import App from './App.vue';
import mitt from 'mitt';

const app = createApp(App);
app.use(store);
app.use(router);

const emitter = mitt();
app.config.globalProperties.emitter = emitter;

app.mount('#app');
