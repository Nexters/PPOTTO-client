const mockInit = jest.fn();
const mockSetGlobalAttributes = jest.fn();
const mockStartSpan = jest.fn();
const mockGetTracer = jest.fn();

jest.mock('@hyperdx/otel-react-native', () => ({
  HyperDXRum: {
    init: mockInit,
    setGlobalAttributes: mockSetGlobalAttributes,
    get provider() {
      return { getTracer: mockGetTracer };
    },
  },
}));

type Observability = typeof import('./observability');

function createSpan() {
  return {
    setAttributes: jest.fn(),
    recordException: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
  };
}

const ENV_KEYS = [
  'EXPO_PUBLIC_HYPERDX_API_KEY',
  'EXPO_PUBLIC_HYPERDX_BEACON_URL',
  'EXPO_PUBLIC_API_URL',
] as const;

function loadModule(env: Partial<Record<(typeof ENV_KEYS)[number], string>>): Observability {
  jest.resetModules();
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest는 resetModules 후 재로딩에 require가 필요하다
  return require('./observability');
}

const withKey = {
  EXPO_PUBLIC_HYPERDX_API_KEY: 'test-key',
  EXPO_PUBLIC_API_URL: 'https://dev-api.ppotto.co.kr',
};

describe('initObservability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('키가 없으면 초기화하지 않는다', () => {
    loadModule({}).initObservability();

    expect(mockInit).not.toHaveBeenCalled();
  });

  it('키가 있으면 환경과 서비스명을 담아 초기화한다', () => {
    loadModule(withKey).initObservability();

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-key',
        service: 'ppotto-mobile',
        deploymentEnvironment: 'development',
      }),
    );
  });

  it('여러 번 호출해도 한 번만 초기화한다', () => {
    const observability = loadModule(withKey);

    observability.initObservability();
    observability.initObservability();

    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});

describe('identifyUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('초기화 전에는 태깅하지 않는다', () => {
    loadModule(withKey).identifyUser('user-1');

    expect(mockSetGlobalAttributes).not.toHaveBeenCalled();
  });

  it('초기화 후에는 userId를 태깅한다', () => {
    const observability = loadModule(withKey);

    observability.initObservability();
    observability.identifyUser('user-1');

    expect(mockSetGlobalAttributes).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});

describe('recordBridgeFailure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('초기화 전에는 기록하지 않는다', () => {
    loadModule(withKey).recordBridgeFailure('GET_ACCESS_TOKEN', new Error('실패'));

    expect(mockGetTracer).not.toHaveBeenCalled();
  });

  it('채널을 검색 가능한 속성으로 남긴다', () => {
    const span = createSpan();
    mockGetTracer.mockReturnValue({ startSpan: mockStartSpan });
    mockStartSpan.mockReturnValue(span);
    const observability = loadModule(withKey);
    const error = new Error('브릿지 응답 없음');

    observability.initObservability();
    observability.recordBridgeFailure('GET_ACCESS_TOKEN', error);

    expect(mockStartSpan).toHaveBeenCalledWith('bridge.failure');
    expect(span.setAttributes).toHaveBeenCalledWith({
      'bridge.channel': 'GET_ACCESS_TOKEN',
    });
    expect(span.recordException).toHaveBeenCalledWith(error);
    expect(span.end).toHaveBeenCalled();
  });

  it('Error가 아닌 값도 Error로 감싸 기록한다', () => {
    const span = createSpan();
    mockGetTracer.mockReturnValue({ startSpan: mockStartSpan });
    mockStartSpan.mockReturnValue(span);
    const observability = loadModule(withKey);

    observability.initObservability();
    observability.recordBridgeFailure('GET_ACCESS_TOKEN', 'timeout');

    expect(span.recordException).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('recordAuthFailure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('단계를 검색 가능한 속성으로 남긴다', () => {
    const span = createSpan();
    mockGetTracer.mockReturnValue({ startSpan: mockStartSpan });
    mockStartSpan.mockReturnValue(span);
    const observability = loadModule(withKey);

    observability.initObservability();
    observability.recordAuthFailure('refresh', new Error('AUTH-002'));

    expect(mockStartSpan).toHaveBeenCalledWith('auth.failure');
    expect(span.setAttributes).toHaveBeenCalledWith({ 'auth.stage': 'refresh' });
  });
});
