import { SENTRY_TRACE_GLOBAL, type SentryTracePayload } from '@ppotto/bridge';

type WindowWithNativeTrace = Window & { [SENTRY_TRACE_GLOBAL]?: SentryTracePayload };

function setMetaTag(name: string, content: string | null) {
  const existing = document.querySelector(`meta[name="${name}"]`);

  if (content === null) {
    existing?.remove();
    return;
  }

  if (existing) {
    existing.setAttribute('content', content);
    return;
  }

  const parent = document.head ?? document.documentElement;
  if (!parent) return;

  const meta = document.createElement('meta');
  meta.setAttribute('name', name);
  meta.setAttribute('content', content);
  parent.appendChild(meta);
}

export function applyNativeTraceMetaTags() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;

  const payload = (window as WindowWithNativeTrace)[SENTRY_TRACE_GLOBAL];
  if (!payload?.sentryTrace) return false;

  setMetaTag('sentry-trace', payload.sentryTrace);
  setMetaTag('baggage', payload.baggage);

  return true;
}
