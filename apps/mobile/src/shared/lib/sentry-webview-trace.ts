import { SENTRY_TRACE_GLOBAL, type SentryTracePayload } from '@ppotto/bridge';
import { getTraceData } from '@sentry/core';

import { SENTRY_ENABLED } from './sentry';

export function buildWebViewTraceScript(): string {
  if (!SENTRY_ENABLED) return '';

  const traceData = getTraceData();
  const sentryTrace = traceData['sentry-trace'];
  if (!sentryTrace) return '';

  const payload: SentryTracePayload = { sentryTrace, baggage: traceData.baggage ?? null };
  return `window.${SENTRY_TRACE_GLOBAL} = ${JSON.stringify(payload)};`;
}
