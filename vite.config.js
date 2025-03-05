import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import eslint from "vite-plugin-eslint";
import path from 'path';
import vueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig({
    plugins: [
        Vue(),
        vueDevTools()
    ],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
        },
    },
    build: {
	    chunkSizeWarningLimit: 2500,
        rollupOptions: {
             output: {
                format: 'esm',
                manualChunks(id) {
                    if (['vue', 'vue-router', '@cristianglezm/flower-evolver-wasm', '@huggingface/transformers'].some(pkg => id.includes(pkg))) {
                        return 'vendor';
                    }
                    if (id.includes('kokoro-js')) {
                        return 'kokoro';
                    }
                 },
             }
         }
    },
    esbuild: {
        legalComments: 'inline',
    },
    envPrefix: ["VITE_APP_"],
    sourcemap: process.env.NODE_ENV === 'development',
    base: process.env.NODE_ENV === 'production' ? process.env.VITE_APP_BASE_URL : '/',
});
