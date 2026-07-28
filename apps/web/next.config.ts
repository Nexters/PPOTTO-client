import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ppotto/api', '@ppotto/bridge'],
};

export default nextConfig;
