import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: 'react-native-svg', replacement: 'react-native-svg/lib/module/elements.web.js' },
      { find: /^react-native$/, replacement: 'react-native-web' },
    ],
  },
});
