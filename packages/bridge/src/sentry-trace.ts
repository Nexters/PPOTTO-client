export const SENTRY_TRACE_GLOBAL = '__ppottoSentryTrace';

export interface SentryTracePayload {
  sentryTrace: string;
  baggage: string | null;
}
