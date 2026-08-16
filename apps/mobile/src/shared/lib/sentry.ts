export const SENTRY_TRACE_PROPAGATION_TARGETS = [
  /^https:\/\/api\.ppotto\.co\.kr(\/|$)/,
  /^https:\/\/dev-api\.ppotto\.co\.kr(\/|$)/,
];

export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const SENTRY_ENVIRONMENT = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? 'development';

export const SENTRY_ENABLED = Boolean(SENTRY_DSN);

export const SENTRY_TRACES_SAMPLE_RATE = SENTRY_ENVIRONMENT === 'production' ? 0.2 : 1;
