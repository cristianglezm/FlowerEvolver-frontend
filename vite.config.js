import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import eslint from "vite-plugin-eslint";
import path from 'path';

export default defineConfig({
    plugins: [Vue()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
	chunkSizeWarningLimit: 2500,
    },
    envPrefix: ["VITE_APP_"],
    sourcemap: process.env.NODE_ENV === "production" ? false : true,
    base: process.env.NODE_ENV === 'production' ? process.env.VITE_APP_BASE_URL:'/',
});
