import globals from 'globals';
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';

export default [
    js.configs.recommended,
    ...pluginVue.configs['flat/recommended'],
    {
        languageOptions:{
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.worker,
                ...globals.es2021
            }
        },
        files: [
              "src/**/*.js", 
              "src/**/*.vue"
        ],
        ignores: [
             "*.config.*",
             "dist",
        ],
        rules:{
            'vue/singleline-html-element-content-newline': 'off',
            'vue/max-attributes-per-line': 'off',
            'vue/multi-word-component-names': 'off',
            'vue/attribute-hyphenation': 'off',
            'no-unused-vars': ['error', 
                {
                    "args": "all",
                    "argsIgnorePattern": "^_",
                    "caughtErrors": "all",
                    "caughtErrorsIgnorePattern": "^_",
                    "destructuredArrayIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "ignoreRestSiblings": true
                }
            ],
        },
    },
    {
        // The tests run in node (vitest, playwright) and, when they start with
        // `@vitest-environment jsdom`, with a browser's globals too: document, Event, File...
        // `describe`, `test` and the rest are imported from vitest and playwright, not globals.
        files: [
            "tests/**/*.js"
        ],
        languageOptions:{
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.browser,
                ...globals.es2021
            }
        },
        rules:{
            // a test declares small components next to the code that mounts them
            'vue/one-component-per-file': 'off',
        },
    }
];
