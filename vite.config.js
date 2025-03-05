import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import eslint from "vite-plugin-eslint";
import path from 'path';
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
    plugins: [
        Vue(),
        vueDevTools()
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
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
    sourcemap: process.env.NODE_ENV === 'development',
    base: process.env.NODE_ENV === 'production' ? process.env.VITE_APP_BASE_URL:'/',
});
