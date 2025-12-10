import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            // React
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // TypeScript
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',

            // General
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/coverage/**'],
    }
);
