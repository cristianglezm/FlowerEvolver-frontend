module.exports = {
    "env": {
        "browser": true,
        "worker": true,
        "es2021": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:vue/vue3-recommended",
    ],
    "parserOptions": {
        "ecmaVersion": 2023,
        "sourceType": "module"
    },
    "plugins": [
        "vue",
    ],
    "rules": {
        'vue/singleline-html-element-content-newline': 'off',
        'vue/max-attributes-per-line': 'off',
        'vue/multi-word-component-names': 'off',
    }
}