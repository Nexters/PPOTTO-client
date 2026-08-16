export const SENTRY_TRACE_PROPAGATION_TARGETS = [
  /^https:\/\/api\.ppotto\.co\.kr(\/|$)/,
  /^https:\/\/dev-api\.ppotto\.co\.kr(\/|$)/,
];

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'development';

export const SENTRY_RELEASE = process.env.NEXT_PUBLIC_SENTRY_RELEASE;

export const SENTRY_DIST = process.env.NEXT_PUBLIC_SENTRY_DIST;

export const SENTRY_ENABLED = Boolean(SENTRY_DSN);

const isProductionEnvironment = SENTRY_ENVIRONMENT === 'production';

export const SENTRY_TRACES_SAMPLE_RATE = isProductionEnvironment ? 0.2 : 1;

export const SENTRY_PROFILE_SESSION_SAMPLE_RATE = isProductionEnvironment ? 0.1 : 1;

export const SENTRY_REPLAYS_SESSION_SAMPLE_RATE = isProductionEnvironment ? 0 : 0.1;

export const SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE = 1;
