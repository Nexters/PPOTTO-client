import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ppotto/api', '@ppotto/bridge'],
  allowedDevOrigins: ['10.0.2.2'],
  images: {
    remotePatterns: [
      { hostname: 'storage.googleapis.com', pathname: '/ppotto-stickers/**' },
      { hostname: 'storage.googleapis.com', pathname: '/ppotto-photos/**' },
    ],
  },
};

export default nextConfig;
