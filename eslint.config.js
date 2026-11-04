import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'tmp_pdfs']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Backend (Vercel functions), scripts y config de Vite: Node, no navegador.
  {
    files: ['api/**/*.js', 'scripts/**/*.{js,mjs,cjs}', 'vite.config.js'],
    languageOptions: { globals: globals.node },
  },
  // Tests (Vitest): describe/it/expect son globals.
  {
    files: ['src/__tests__/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
])
