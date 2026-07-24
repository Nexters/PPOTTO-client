import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gallery/api', '@gallery/bridge'],
};

export default nextConfig;
