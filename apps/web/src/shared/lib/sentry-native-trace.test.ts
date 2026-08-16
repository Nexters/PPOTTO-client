import { SENTRY_TRACE_GLOBAL, type SentryTracePayload } from '@ppotto/bridge';
import { afterEach, describe, expect, it } from 'vitest';

import { applyNativeTraceMetaTags } from './sentry-native-trace';

type WindowWithNativeTrace = Window & { [SENTRY_TRACE_GLOBAL]?: SentryTracePayload };

function metaContent(name: string) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
}

afterEach(() => {
  delete (window as WindowWithNativeTrace)[SENTRY_TRACE_GLOBAL];
  document.querySelectorAll('meta[name="sentry-trace"], meta[name="baggage"]').forEach((meta) => {
    meta.remove();
  });
});

describe('applyNativeTraceMetaTags', () => {
  it('네이티브가 주입한 trace를 meta 태그로 옮긴다', () => {
    (window as WindowWithNativeTrace)[SENTRY_TRACE_GLOBAL] = {
      sentryTrace: 'abc123-def456-1',
      baggage: 'sentry-trace_id=abc123',
    };

    expect(applyNativeTraceMetaTags()).toBe(true);
    expect(metaContent('sentry-trace')).toBe('abc123-def456-1');
    expect(metaContent('baggage')).toBe('sentry-trace_id=abc123');
  });

  it('baggage가 없으면 sentry-trace만 심는다', () => {
    (window as WindowWithNativeTrace)[SENTRY_TRACE_GLOBAL] = {
      sentryTrace: 'abc123-def456-1',
      baggage: null,
    };

    expect(applyNativeTraceMetaTags()).toBe(true);
    expect(metaContent('sentry-trace')).toBe('abc123-def456-1');
    expect(metaContent('baggage')).toBeUndefined();
  });

  it('baggage가 없으면 SSR이 남긴 baggage를 지워 trace가 섞이지 않게 한다', () => {
    const existing = document.createElement('meta');
    existing.setAttribute('name', 'baggage');
    existing.setAttribute('content', 'sentry-trace_id=server');
    document.head.appendChild(existing);

    (window as WindowWithNativeTrace)[SENTRY_TRACE_GLOBAL] = {
      sentryTrace: 'abc123-def456-1',
      baggage: null,
    };

    applyNativeTraceMetaTags();

    expect(metaContent('baggage')).toBeUndefined();
  });

  it('브라우저 단독 실행처럼 네이티브 trace가 없으면 아무것도 하지 않는다', () => {
    expect(applyNativeTraceMetaTags()).toBe(false);
    expect(metaContent('sentry-trace')).toBeUndefined();
  });

  it('Next가 SSR에서 심은 meta 태그보다 네이티브 trace가 우선한다', () => {
    const existing = document.createElement('meta');
    existing.setAttribute('name', 'sentry-trace');
    existing.setAttribute('content', 'server-rendered-trace');
    document.head.appendChild(existing);

    (window as WindowWithNativeTrace)[SENTRY_TRACE_GLOBAL] = {
      sentryTrace: 'abc123-def456-1',
      baggage: 'sentry-trace_id=abc123',
    };

    applyNativeTraceMetaTags();

    expect(metaContent('sentry-trace')).toBe('abc123-def456-1');
    expect(document.querySelectorAll('meta[name="sentry-trace"]')).toHaveLength(1);
  });
});
