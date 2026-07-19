export default [
  {
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: '@/**',
              group: 'parent',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],

      'no-console': ['error', { allow: ['warn', 'error'] }],

      'no-implicit-coercion': [
        'error',
        {
          allow: ['!!'],
        },
      ],

      'no-return-await': 'off',
    },
  },
  {
    // @typescript-eslint 룰은 TS 파일에만 — .js/.mjs에는 플러그인이 등록돼 있지 않음
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: false,
          allowTaggedTemplates: true,
        },
      ],

      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
];
