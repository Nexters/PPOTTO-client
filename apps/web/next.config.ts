import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ppotto/api', '@ppotto/assets', '@ppotto/bridge'],
  allowedDevOrigins: ['10.0.2.2'],
  images: {
    remotePatterns: [
      { hostname: 'storage.googleapis.com', pathname: '/ppotto-stickers/**' },
      { hostname: 'storage.googleapis.com', pathname: '/ppotto-photos/**' },
    ],
  },
  turbopack: {
    resolveAlias: {
      'react-native': 'react-native-web',
      'react-native-svg': 'react-native-svg/lib/module/elements.web.js',
    },
  },
};

export default nextConfig;
