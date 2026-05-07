// @ts-check
import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginSvelte from 'eslint-plugin-svelte';

export default defineConfig(
  globalIgnores([
    '**/node_modules/**',
    '**/.svelte-kit/**',
    '**/build/**',
    '**/dist/**',
    '**/*.min.js',
    '**/.vercel/**',
    '**/*.d.ts',
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginSvelte.configs['flat/recommended'],
  // Svelte: TypeScript script + browser globals; relax Kit-specific rules
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        HTMLElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLUListElement: 'readonly',
        Element: 'readonly',
        Node: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        CustomEvent: 'readonly',
        URLSearchParams: 'readonly',
        File: 'readonly',
        FileList: 'readonly',
        FormData: 'readonly',
        Response: 'readonly',
      },
    },
    rules: {
      // SvelteKit uses <a href> and goto(); resolve() is for non-Kit
      'svelte/no-navigation-without-resolve': 'off',
      'svelte/require-each-key': 'warn',
    },
  },
  /** SvelteKit web app: browser APIs (`fetch`, `URL`, DOM types, etc.) for `no-undef`. */
  {
    files: ['apps/web/**/*.{svelte,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  /**
   * Svelte 5 / Kit: expression statements and built-ins are intentional; prefer-* rules stay noisy
   * until refactors. Unused `_` bindings are common in destructuring.
   */
  {
    files: ['apps/web/**/*.svelte'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      'svelte/prefer-svelte-reactivity': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Same stylistic rules as `.prettierrc` (incl. `apps/web/.prettierrc` → repo root).
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        Buffer: 'readonly',
        global: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  }
);
