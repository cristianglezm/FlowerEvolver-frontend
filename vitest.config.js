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
        // Node by default: creating a jsdom for every test file was most of the time the tests took.
        // A test that needs a DOM starts with `// @vitest-environment jsdom`.
        environment: 'node',
        setupFiles: [
            'tests/unit/setup/localStorage.js',
            'tests/unit/setup/jsdom.js',
            'tests/unit/setup/fakeIndexedDB.js',
        ],
        include: ['tests/unit/**/*.test.js'],
        globals: false,
        isolate: true,
    },
});
