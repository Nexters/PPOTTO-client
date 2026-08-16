const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname);

// inlineRem 기본값은 14라서 Tailwind 간격이 시안보다 12.5% 작아진다(p-2 = 7px).
// 16으로 맞추면 4px 격자와 1:1이 되어 p-2 = 8px, size-6 = 24px로 시안과 같아진다.
module.exports = withNativeWind(config, { input: './src/global.css', inlineRem: 16 });
