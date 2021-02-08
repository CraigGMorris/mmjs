module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "es2020": true,
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "sourceType": "module",
        "ecmaFeatures": {
            "jsx": false
        },
        "ecmaVersion": 2020
    },
    "plugins": [
        "react",
        "react-hooks",
    ],
    "globals": {
        "React": "readonly",
        "ReactDOM": "readonly",
    },
    "rules": {
        "react/prop-types": "off",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
    },
};