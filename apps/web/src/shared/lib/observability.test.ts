import { beforeEach, describe, expect, it, vi } from 'vitest';

const hyperdx = vi.hoisted(() => ({
  init: vi.fn(),
  setGlobalAttributes: vi.fn(),
  addAction: vi.fn(),
  recordException: vi.fn(),
}));

vi.mock('@hyperdx/browser', () => ({ default: hyperdx }));

type Observability = typeof import('./observability');

const ENV_KEYS = [
  'NEXT_PUBLIC_HYPERDX_API_KEY',
  'NEXT_PUBLIC_HYPERDX_URL',
  'NEXT_PUBLIC_API_URL',
] as const;

async function loadModule(
  env: Partial<Record<(typeof ENV_KEYS)[number], string>>,
): Promise<Observability> {
  vi.resetModules();
  for (const key of ENV_KEYS) vi.stubEnv(key, undefined as unknown as string);
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import('./observability');
}

const withKey = {
  NEXT_PUBLIC_HYPERDX_API_KEY: 'test-key',
  NEXT_PUBLIC_API_URL: 'https://dev-api.ppotto.co.kr',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('initObservability', () => {
  it('키가 없으면 초기화하지 않는다', async () => {
    (await loadModule({})).initObservability();

    expect(hyperdx.init).not.toHaveBeenCalled();
  });

  it('키가 있으면 환경과 서비스명을 담아 초기화한다', async () => {
    (await loadModule(withKey)).initObservability();

    expect(hyperdx.init).toHaveBeenCalledTimes(1);
    expect(hyperdx.init).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-key',
        service: 'ppotto-web',
        otelResourceAttributes: { environment: 'development' },
      }),
    );
  });

  it('세션 리플레이는 비활성으로 초기화한다', async () => {
    (await loadModule(withKey)).initObservability();

    expect(hyperdx.init).toHaveBeenCalledWith(expect.objectContaining({ disableReplay: true }));
  });

  it('여러 번 호출해도 한 번만 초기화한다', async () => {
    const observability = await loadModule(withKey);

    observability.initObservability();
    observability.initObservability();

    expect(hyperdx.init).toHaveBeenCalledTimes(1);
  });
});

describe('초기화 전 호출', () => {
  it('아무것도 수집하지 않는다', async () => {
    const observability = await loadModule(withKey);

    observability.identifyUser('user-1');
    observability.trackScreen('Board');
    observability.recordBridgeFailure('GET_ACCESS_TOKEN', new Error('실패'));

    expect(hyperdx.setGlobalAttributes).not.toHaveBeenCalled();
    expect(hyperdx.addAction).not.toHaveBeenCalled();
    expect(hyperdx.recordException).not.toHaveBeenCalled();
  });
});

describe('초기화 후 수집', () => {
  let observability: Observability;

  beforeEach(async () => {
    observability = await loadModule(withKey);
    observability.initObservability();
  });

  it('userId를 태깅한다', () => {
    observability.identifyUser('user-1');

    expect(hyperdx.setGlobalAttributes).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  it('화면 전환을 screen_view로 남긴다', () => {
    observability.trackScreen('Board');

    expect(hyperdx.addAction).toHaveBeenCalledWith('screen_view', { activity: 'Board' });
  });

  it('브릿지 채널을 검색 가능한 속성으로 남긴다', () => {
    const error = new Error('브릿지 응답 없음');

    observability.recordBridgeFailure('GET_ACCESS_TOKEN', error);

    expect(hyperdx.recordException).toHaveBeenCalledWith(error, {
      'bridge.channel': 'GET_ACCESS_TOKEN',
    });
  });

  it('Error가 아닌 값도 Error로 감싸 기록한다', () => {
    observability.recordBridgeFailure('GET_ACCESS_TOKEN', 'timeout');

    expect(hyperdx.recordException).toHaveBeenCalledWith(expect.any(Error), {
      'bridge.channel': 'GET_ACCESS_TOKEN',
    });
  });
});
