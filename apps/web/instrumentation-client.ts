import * as Sentry from '@sentry/nextjs';

import { applyNativeTraceMetaTags } from '@/shared/lib/sentry-native-trace';
import {
  SENTRY_DSN,
  SENTRY_ENABLED,
  SENTRY_ENVIRONMENT,
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
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    tracePropagationTargets: SENTRY_TRACE_PROPAGATION_TARGETS,
    replaysSessionSampleRate: SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    integrations: [
      Sentry.browserTracingIntegration({ instrumentNavigation: false }),
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
