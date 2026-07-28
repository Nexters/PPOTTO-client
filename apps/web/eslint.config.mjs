import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import ppottoRules from '@ppotto/eslint-rules';
import baseRules from '@ppotto/eslint-rules/base';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...baseRules,
  {
    files: ['**/*.{ts,tsx,jsx}'],
    plugins: { classname: ppottoRules },
    rules: {
      'classname/no-long-classname': ['warn', { maxClasses: 7, cnImportPath: '@/shared/lib/cn' }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
