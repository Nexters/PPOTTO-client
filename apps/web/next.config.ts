import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ppotto/api', '@ppotto/bridge'],
  allowedDevOrigins: ['10.0.2.2'],
};

export default nextConfig;
