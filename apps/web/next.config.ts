import path from 'node:path';

import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const allowedDevOrigin = process.env.NEXT_ALLOWED_DEV_ORIGIN;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryRelease = process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA;
const sentryDist = process.env.SENTRY_DIST ?? process.env.VERCEL_DEPLOYMENT_ID;

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@ppotto/api', '@ppotto/assets', '@ppotto/bridge'],
  allowedDevOrigins: ['10.0.2.2', ...(allowedDevOrigin ? [allowedDevOrigin] : [])],
  env: {
    ...(sentryRelease ? { NEXT_PUBLIC_SENTRY_RELEASE: sentryRelease } : {}),
    ...(sentryDist ? { NEXT_PUBLIC_SENTRY_DIST: sentryDist } : {}),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Document-Policy', value: 'js-profiling' }],
      },
    ];
  },
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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? 'ppotto',
  project: process.env.SENTRY_PROJECT ?? 'ppotto-web',
  sentryUrl: process.env.SENTRY_URL ?? 'https://sentry.ppotto.co.kr/',
  authToken: sentryAuthToken,
  telemetry: false,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  release: {
    name: sentryRelease,
    dist: sentryDist,
    create: Boolean(sentryAuthToken),
    finalize: Boolean(sentryAuthToken),
  },
  sourcemaps: {
    disable: !sentryAuthToken,
    deleteSourcemapsAfterUpload: true,
  },
});
