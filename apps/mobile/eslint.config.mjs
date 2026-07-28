import ppottoRules from '@ppotto/eslint-rules';
import baseRules from '@ppotto/eslint-rules/base';
import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

export default defineConfig([
  ...expoConfig,
  ...baseRules,
  {
    files: ['**/*.{ts,tsx,jsx}'],
    plugins: { classname: ppottoRules },
    rules: {
      'classname/no-long-classname': ['warn', { maxClasses: 9, cnImportPath: '@/lib/cn' }],
    },
  },
  {
    ignores: ['dist/**', '.expo/**', 'scripts/**'],
  },
]);
