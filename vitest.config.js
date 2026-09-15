import { defineConfig } from 'vitest/config';
import Vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [
        Vue(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
        },
    },
    test: {
        environment: 'jsdom',
        include: ['tests/unit/**/*.test.js'],
        globals: false,
    },
});
