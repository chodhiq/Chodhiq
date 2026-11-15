import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';
import globals from 'globals';

export default defineConfig([
  ...expoConfig,
  {
    ignores: [
      'admin-dashboard/**',
      'business-dashboard/**',
      'coming-soon/**',
      'Chodhiq/**',
      'dist*/**',
      'android/**',
      'artifacts/**',
      'output/**',
      'outputs/**',
      'release-artifacts/**',
      'audit-packages/**',
      'tmp/**',
      'node_modules/**',
    ],
  },
  {
    files: ['tests/**/*.{js,mjs,cjs,ts,tsx}', '__tests__/**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    rules: {
      // Keep React Compiler diagnostics visible without requiring an architecture rewrite.
      'import/namespace': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
]);
