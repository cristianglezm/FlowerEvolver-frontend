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
    }
];
