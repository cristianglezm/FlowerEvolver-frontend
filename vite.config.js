import { defineConfig } from 'vite'
//import vue from '@vitejs/plugin-vue'
import { createVuePlugin as Vue } from "vite-plugin-vue2";

const path = require("path");
export default defineConfig({
    plugins: [Vue()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    envPrefix: ["VITE_APP_"],
    sourcemap: process.env.NODE_ENV == "production" ? false:true,
});
