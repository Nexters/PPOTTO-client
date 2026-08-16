import * as Sentry from '@sentry/nextjs';

import { applyNativeTraceMetaTags } from '@/shared/lib/sentry-native-trace';
import {
  SENTRY_DIST,
  SENTRY_DSN,
  SENTRY_ENABLED,
  SENTRY_ENVIRONMENT,
  SENTRY_PROFILE_SESSION_SAMPLE_RATE,
  SENTRY_RELEASE,
  SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
  SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
  SENTRY_TRACES_SAMPLE_RATE,
  SENTRY_TRACE_PROPAGATION_TARGETS,
} from '@/shared/lib/sentry';

if (SENTRY_ENABLED) {
  applyNativeTraceMetaTags();

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
    profileSessionSampleRate: SENTRY_PROFILE_SESSION_SAMPLE_RATE,
    profileLifecycle: 'trace',
    replaysSessionSampleRate: SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    integrations: [
      Sentry.browserTracingIntegration({ instrumentNavigation: false }),
      Sentry.browserProfilingIntegration(),
      Sentry.consoleLoggingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: false,
        blockAllMedia: true,
        block: ['.sentry-block', '[data-sentry-block]'],
      }),
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
