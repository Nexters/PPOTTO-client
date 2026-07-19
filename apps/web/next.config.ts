import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @gallery/api는 TS 소스를 그대로 export하므로 트랜스파일 대상에 포함
  transpilePackages: ['@gallery/api'],
};

export default nextConfig;
