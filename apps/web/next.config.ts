import type { NextConfig } from 'next';

const allowedDevOrigin = process.env.NEXT_ALLOWED_DEV_ORIGIN;

const nextConfig: NextConfig = {
  transpilePackages: ['@ppotto/api', '@ppotto/assets', '@ppotto/bridge'],
  allowedDevOrigins: ['10.0.2.2', ...(allowedDevOrigin ? [allowedDevOrigin] : [])],
  images: {
    remotePatterns: [
      { hostname: 'storage.googleapis.com', pathname: '/ppotto-bucket-dev/stickers/**' },
      { hostname: 'storage.googleapis.com', pathname: '/ppotto-bucket-dev/photos/**' },
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
