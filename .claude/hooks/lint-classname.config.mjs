/**
 * Claude Stop 훅 전용 ESLint flat config.
 * no-long-classname 룰만 등록 — 다른 룰 autofix 가 끼어들지 않게.
 */

import galleryRules from '@gallery/eslint-rules';
import tseslint from 'typescript-eslint';

const languageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
};

export default [
  {
    files: ['apps/web/**/*.{ts,tsx,jsx}'],
    languageOptions,
    plugins: { classname: galleryRules },
    rules: {
      'classname/no-long-classname': ['warn', { maxClasses: 7, cnImportPath: '@/shared/lib/cn' }],
    },
  },
  {
    files: ['apps/mobile/**/*.{ts,tsx,jsx}'],
    languageOptions,
    plugins: { classname: galleryRules },
    rules: {
      'classname/no-long-classname': ['warn', { maxClasses: 9, cnImportPath: '@/lib/cn' }],
    },
  },
];
