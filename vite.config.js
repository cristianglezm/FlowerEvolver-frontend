import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import eslint from "vite-plugin-eslint";
import path from 'path';
import vueDevTools from 'vite-plugin-vue-devtools';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        Vue(),
        vueDevTools(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
            },
            manifest: {
                name: 'FlowerEvolver',
                description: 'An application to make, mutate and reproduce flowers.',
                theme_color: 'lightgreen',
                background_color: 'green',
                icons:[
                    {
                        src: 'favicon.ico',
                        sizes: '32x32',
                        type: 'image/x-icon'
                    }
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
        },
    },
    build: {
        target: 'esnext',
        sourcemap: process.env.NODE_ENV === 'development',
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
        format: 'esm',
    },
    envPrefix: ["VITE_APP_"],
    base: process.env.NODE_ENV === 'production' ? process.env.VITE_APP_BASE_URL : '/',
});
