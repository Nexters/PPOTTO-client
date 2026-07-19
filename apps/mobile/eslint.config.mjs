import galleryRules from '@gallery/eslint-rules';
import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

export default defineConfig([
  ...expoConfig,
  {
    files: ['**/*.{ts,tsx,jsx}'],
    plugins: { classname: galleryRules },
    rules: {
      'classname/no-long-classname': ['warn', { maxClasses: 9, cnImportPath: '@/lib/cn' }],
    },
  },
  {
    ignores: ['dist/**', '.expo/**'],
  },
]);
