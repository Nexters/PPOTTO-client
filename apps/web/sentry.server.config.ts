import * as Sentry from '@sentry/nextjs';

import {
  SENTRY_DIST,
  SENTRY_DSN,
  SENTRY_ENABLED,
  SENTRY_ENVIRONMENT,
  SENTRY_RELEASE,
  SENTRY_TRACES_SAMPLE_RATE,
  SENTRY_TRACE_PROPAGATION_TARGETS,
} from '@/shared/lib/sentry';

if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    dist: SENTRY_DIST,
    sendDefaultPii: true,
    attachStacktrace: true,
    enableLogs: true,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    tracePropagationTargets: SENTRY_TRACE_PROPAGATION_TARGETS,
    integrations: [Sentry.consoleLoggingIntegration()],
  });
}
