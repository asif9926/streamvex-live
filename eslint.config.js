// eslint.config.js — ESLint v9 flat config
// StreamVex Live
//
// এই ফাইলটা আগে ছিল না — ESLint v9 থেকে .eslintrc.* এর বদলে
// eslint.config.js (flat config) বাধ্যতামূলক। এটা না থাকায়
// `npm run lint` সরাসরি crash করত।

import js              from '@eslint/js'
import react            from 'eslint-plugin-react'
import reactHooks       from 'eslint-plugin-react-hooks'
import globals           from 'globals'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType:  'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      react:       react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope':  'off',  // Vite + React 18 JSX runtime — import লাগে না
      'react/prop-types':          'off',  // PropTypes ব্যবহার হচ্ছে না এই প্রজেক্টে
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Build output ও config ফাইল lint করার দরকার নেই
    ignores: ['dist/**', 'node_modules/**', 'cors-proxy/**'],
  },
]
