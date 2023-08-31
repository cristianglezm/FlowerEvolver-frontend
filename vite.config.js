import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'

const path = require("path");
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
    sourcemap: process.env.NODE_ENV == "production" ? false:true,
    publicPath: process.env.NODE_ENV === 'production' ? process.env.VITE_APP_BASE_URL:'/',
});
