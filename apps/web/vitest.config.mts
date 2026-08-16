import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // 전체 스위트 병렬 실행 시 개별 테스트가 기본 5초를 넘기는 플레이크 방지
    testTimeout: 15000,
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: 'react-native-svg', replacement: 'react-native-svg/lib/module/elements.web.js' },
      { find: /^react-native$/, replacement: 'react-native-web' },
    ],
  },
});
