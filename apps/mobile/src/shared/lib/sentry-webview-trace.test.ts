import { SENTRY_TRACE_GLOBAL } from '@ppotto/bridge';
import { getTraceData, SDK_VERSION } from '@sentry/core';

import { buildWebViewTraceScript } from './sentry-webview-trace';

jest.mock('@sentry/core', () => ({
  ...jest.requireActual('@sentry/core'),
  getTraceData: jest.fn(),
}));

jest.mock('./sentry', () => ({ SENTRY_ENABLED: true }));

const mockedGetTraceData = getTraceData as jest.MockedFunction<typeof getTraceData>;

describe('buildWebViewTraceScript', () => {
  beforeEach(() => {
    mockedGetTraceData.mockReset();
  });

  it('@sentry/react-native가 쓰는 @sentry/core와 같은 버전을 해석한다', () => {
    const reactNativeCoreVersion = (
      require('@sentry/react-native/package.json') as {
        dependencies: Record<string, string>;
      }
    ).dependencies['@sentry/core'];

    expect(SDK_VERSION).toBe(reactNativeCoreVersion);
  });

  it('trace 정보를 window 전역에 심는 스크립트를 만든다', () => {
    mockedGetTraceData.mockReturnValue({
      'sentry-trace': 'abc123-def456-1',
      baggage: 'sentry-trace_id=abc123,sentry-environment=development',
    });

    const script = buildWebViewTraceScript();

    expect(script).toContain(`window.${SENTRY_TRACE_GLOBAL} =`);
    expect(JSON.parse(script.slice(script.indexOf('{'), script.lastIndexOf('}') + 1))).toEqual({
      sentryTrace: 'abc123-def456-1',
      baggage: 'sentry-trace_id=abc123,sentry-environment=development',
    });
  });

  it('baggage가 없어도 sentry-trace만으로 스크립트를 만든다', () => {
    mockedGetTraceData.mockReturnValue({ 'sentry-trace': 'abc123-def456-1' });

    expect(buildWebViewTraceScript()).toContain('"baggage":null');
  });

  it('sentry-trace가 없으면 빈 문자열을 반환한다', () => {
    mockedGetTraceData.mockReturnValue({});

    expect(buildWebViewTraceScript()).toBe('');
  });
});
