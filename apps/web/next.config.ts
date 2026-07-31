import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ppotto/api', '@ppotto/assets', '@ppotto/bridge'],
  turbopack: {
    resolveAlias: {
      'react-native': 'react-native-web',
      'react-native-svg': 'react-native-svg/lib/module/elements.web.js',
    },
  },
  allowedDevOrigins: ['172.30.1.61'],
};

export default nextConfig;
