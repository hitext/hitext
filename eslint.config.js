import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.mocha,
                ...globals.es6
            }
        },
        rules: {
            // Disable new stricter rules that weren't in the previous config
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            'no-prototype-builtins': 'off',
            'no-cond-assign': 'off',
            'no-duplicate-case': 'error',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    args: 'after-used'
                }
            ],
            'no-undef': 'error',
            'no-empty': [
                'error',
                {
                    allowEmptyCatch: true
                }
            ],
            'no-implicit-coercion': [
                'error',
                {
                    boolean: true,
                    string: true,
                    number: true
                }
            ],
            'no-with': 'error',
            'brace-style': 'error',
            'no-mixed-spaces-and-tabs': 'error',
            'no-multiple-empty-lines': 'error',
            'no-multi-str': 'error',
            'dot-location': ['error', 'property'],
            'operator-linebreak': [
                'error',
                'after',
                {
                    overrides: {
                        '?': 'before',
                        ':': 'before'
                    }
                }
            ],
            'key-spacing': [
                'error',
                {
                    beforeColon: false,
                    afterColon: true
                }
            ],
            'space-unary-ops': [
                'error',
                {
                    words: false,
                    nonwords: false
                }
            ],
            'space-before-function-paren': [
                'error',
                {
                    anonymous: 'ignore',
                    named: 'never'
                }
            ],
            'array-bracket-spacing': ['error', 'never'],
            'space-in-parens': ['error', 'never'],
            'comma-dangle': ['error', 'never'],
            'no-trailing-spaces': 'error',
            'yoda': ['error', 'never'],
            'camelcase': [
                'error',
                {
                    properties: 'never'
                }
            ],
            'comma-style': ['error', 'last'],
            'curly': ['error', 'all'],
            'dot-notation': 'error',
            'eol-last': 'error',
            'one-var': ['error', 'never'],
            'wrap-iife': 'error',
            'space-infix-ops': 'error',
            'keyword-spacing': [
                'error',
                {
                    overrides: {
                        else: { before: true },
                        while: { before: true },
                        catch: { before: true },
                        finally: { before: true }
                    }
                }
            ],
            'spaced-comment': ['error', 'always'],
            'space-before-blocks': ['error', 'always'],
            'semi': ['error', 'always'],
            'indent': [
                'error',
                4,
                {
                    SwitchCase: 1
                }
            ],
            'linebreak-style': ['error', 'unix'],
            'quotes': [
                'error',
                'single',
                {
                    avoidEscape: true
                }
            ]
        }
    }
);
