import vueDevTools from 'vite-plugin-vue-devtools';
import { VitePWA } from 'vite-plugin-pwa';
import eslint from "vite-plugin-eslint";
import Vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    plugins: [
        Vue(),
        vueDevTools(),
        eslint(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,tgz,zip,otf,json}'],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        sourcemap: process.env.NODE_ENV === 'development',
	    chunkSizeWarningLimit: 2500,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: [
                        'vue',
                        'vue-router',
                        '@cristianglezm/flower-evolver-wasm',
                        '@huggingface/transformers',
                    ],
                    kokoro: [
                        'kokoro-js',
                    ]
                }
            }
        }
    },
    esbuild: {
        legalComments: 'inline',
    },
    envPrefix: ["VITE_APP_"],
    base: process.env.NODE_ENV === 'production' ? process.env.VITE_APP_BASE_URL:'/',
});
