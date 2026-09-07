import type { AnalysisLoadingBridgeState } from '@ppotto/bridge';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalysisLoadingPage } from './AnalysisLoadingPage';

interface MotionOptions {
  boardBgSrc: string;
  speed: number;
  phase: string;
  visualProgress: number;
  photos: Array<{ src: string; ratio: number; capturedAt: null }>;
  stickerSrcs: string[];
  onPhaseStarted: (phase: 'SCAN' | 'REVEAL') => void;
  onPhaseFinished: (phase: AnalysisLoadingBridgeState['visiblePhase']) => Promise<unknown>;
  onRevealFinished: () => void;
}

const mocks = vi.hoisted(() => {
  const state = {
    jobId: 'job-1',
    photoCount: 20,
    photos: Array.from({ length: 20 }, (_, index) => ({
      id: `photo-${index}`,
      uri: `data:image/jpeg;base64,${index}`,
      width: 300,
      height: 400,
    })),
    visiblePhase: 'SCAN' as const,
    visualProgress: 25,
  };
  const nextState = { visiblePhase: 'GROUP' as const, visualProgress: 50 };
  const request = vi.fn((message: string) =>
    Promise.resolve(message === 'GET_ANALYSIS_LOADING_STATE' ? state : nextState),
  );
  const send = vi.fn();
  const decode = vi.fn(() => Promise.resolve());
  const start = vi.fn();
  const destroy = vi.fn();
  const setICloudNotice = vi.fn();
  const createLoadingMotion = vi.fn((_options: MotionOptions) => ({
    start,
    destroy,
    setICloudNotice,
  }));
  const replace = vi.fn();
  const boardList = vi.fn(() => Promise.resolve([{ id: 'board-1', name: '보드' }]));
  const boardGet = vi.fn(() =>
    Promise.resolve({
      id: 'board-1',
      stickers: [
        { imageUrl: 'https://storage.example.com/sticker-1.png' },
        { imageUrl: 'https://storage.example.com/sticker-2.png' },
        { imageUrl: 'https://storage.example.com/sticker-3.png' },
      ],
    }),
  );
  const preloadStickerImages = vi.fn(() => Promise.resolve());
  const fetchQuery = vi.fn(({ queryFn }: { queryFn: () => Promise<unknown> }) => queryFn());
  const eventHandlers = new Map<string, () => void>();
  const on = vi.fn((message: string, handler: () => void) => {
    eventHandlers.set(message, handler);
    return () => eventHandlers.delete(message);
  });

  return {
    boardGet,
    boardList,
    createLoadingMotion,
    decode,
    destroy,
    eventHandlers,
    fetchQuery,
    nextState,
    on,
    preloadStickerImages,
    replace,
    request,
    send,
    start,
    state,
  };
});

vi.mock('@stackflow/react', () => ({ useFlow: () => ({ replace: mocks.replace }) }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ fetchQuery: mocks.fetchQuery }),
}));
vi.mock('@/entities/board/api/board-api', () => ({
  boardApi: { get: mocks.boardGet, list: mocks.boardList },
}));
vi.mock('@/shared/lib/bridge', () => ({
  bridge: { on: mocks.on, request: mocks.request, send: mocks.send },
}));
vi.mock('@/shared/lib/sticker-raster', () => ({
  preloadStickerImages: mocks.preloadStickerImages,
}));
vi.mock('./ppotto-loading-motion', () => ({ createLoadingMotion: mocks.createLoadingMotion }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

Object.defineProperty(HTMLImageElement.prototype, 'decode', {
  configurable: true,
  value: mocks.decode,
});

describe('AnalysisLoadingPage', () => {
  it('개발 브라우저에서는 목 사진 디코딩 후 모든 막을 재생하고 네이티브와 보드 API는 호출하지 않는다', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const photos = Array.from({ length: 40 }, (_, index) => ({
      ...mocks.state.photos[0],
      id: `mock-photo-${index}`,
    }));
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json({ ...mocks.state, photoCount: 40, photos })),
    );
    vi.stubGlobal('fetch', fetchMock);
    let finishFirstDecode: (() => void) | undefined;
    mocks.decode.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishFirstDecode = resolve)),
    );

    render(<AnalysisLoadingPage />);
    await waitFor(() => expect(mocks.decode).toHaveBeenCalledTimes(50));
    expect(mocks.start).not.toHaveBeenCalled();
    finishFirstDecode?.();
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/dev/analysis-loading', { cache: 'no-store' });

    const options = mocks.createLoadingMotion.mock.calls[0]![0];
    expect(options.photos).toHaveLength(40);
    expect(options.phase).toBe('SCAN');
    expect(options.visualProgress).toBe(25);
    expect(options.speed).toBe(0.6);
    for (const [phase, visiblePhase, visualProgress] of [
      ['SCAN', 'GROUP', 50],
      ['GROUP', 'ASSEMBLE', 75],
      ['ASSEMBLE', 'DECK', 99],
      ['DECK', 'REVEAL', 99],
    ] as const) {
      await expect(options.onPhaseFinished(phase)).resolves.toEqual({
        visiblePhase,
        visualProgress,
      });
    }
    options.onPhaseStarted('SCAN');
    options.onPhaseStarted('REVEAL');
    options.onRevealFinished();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.boardList).not.toHaveBeenCalled();
    expect(mocks.preloadStickerImages).not.toHaveBeenCalled();
  });

  it.each([
    ['ReactNativeWebView', { postMessage: vi.fn() }],
    ['WebViewBridgeKit', {}],
    ['webkit', { messageHandlers: { webviewBridgeKit: {} } }],
  ])('개발 환경이어도 %s가 있으면 실제 네이티브 상태를 사용한다', async (name, value) => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubGlobal(name, value);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<AnalysisLoadingPage />);
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    expect(mocks.request).toHaveBeenCalledWith('GET_ANALYSIS_LOADING_STATE');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('프로덕션에서는 개발 로그인 플래그가 켜져도 목데이터를 사용하지 않는다', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEV_LOGIN', 'true');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<AnalysisLoadingPage />);
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    expect(mocks.request).toHaveBeenCalledWith('GET_ANALYSIS_LOADING_STATE');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('로컬 목데이터가 없으면 생성 안내를 보여준다', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))),
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(<AnalysisLoadingPage />);
      expect(await screen.findByRole('alert')).toHaveTextContent('mock/generate.mjs');
      expect(mocks.start).not.toHaveBeenCalled();
      expect(mocks.request).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('RN 상태로 모션을 시작하고 막 경계와 종료를 브리지로 알린다', async () => {
    let finishFirstDecode: (() => void) | undefined;
    mocks.decode.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishFirstDecode = resolve)),
    );
    const { unmount } = render(<AnalysisLoadingPage />);

    await waitFor(() => expect(mocks.decode).toHaveBeenCalledTimes(30));
    expect(mocks.start).not.toHaveBeenCalled();
    finishFirstDecode?.();
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    const options = mocks.createLoadingMotion.mock.calls[0]![0];

    expect(options.speed).toBe(0.6);
    expect(options.phase).toBe('SCAN');
    expect(options.boardBgSrc).toBe('/analysis-loading/board-bg.png');
    expect(options.stickerSrcs).toHaveLength(9);
    expect(options.photos).toHaveLength(20);
    expect(options.photos[0]).toMatchObject({
      src: mocks.state.photos[0]!.uri,
      ratio: 0.75,
      capturedAt: null,
    });
    expect(mocks.send).toHaveBeenCalledWith('ANALYSIS_LOADING_READY', { jobId: 'job-1' });

    options.onPhaseStarted('SCAN');
    expect(mocks.boardList).not.toHaveBeenCalled();
    options.onPhaseStarted('REVEAL');
    await waitFor(() =>
      expect(mocks.preloadStickerImages).toHaveBeenCalledWith([
        'https://storage.example.com/sticker-1.png',
        'https://storage.example.com/sticker-2.png',
        'https://storage.example.com/sticker-3.png',
      ]),
    );
    await expect(options.onPhaseFinished('SCAN')).resolves.toEqual(mocks.nextState);
    options.onRevealFinished();
    await waitFor(() =>
      expect(mocks.send).toHaveBeenCalledWith('ANALYSIS_LOADING_REVEAL_FINISHED', {
        jobId: 'job-1',
      }),
    );

    expect(mocks.send).toHaveBeenCalledWith('ANALYSIS_LOADING_PHASE_STARTED', {
      jobId: 'job-1',
      phase: 'SCAN',
    });
    expect(mocks.send).toHaveBeenCalledWith('ANALYSIS_LOADING_PHASE_STARTED', {
      jobId: 'job-1',
      phase: 'REVEAL',
    });
    expect(mocks.request).toHaveBeenCalledWith('ANALYSIS_LOADING_PHASE_FINISHED', {
      jobId: 'job-1',
      phase: 'SCAN',
    });
    expect(mocks.send).toHaveBeenCalledWith('ANALYSIS_LOADING_REVEAL_FINISHED', {
      jobId: 'job-1',
    });
    expect(mocks.boardList).toHaveBeenCalledTimes(1);
    expect(mocks.boardGet).toHaveBeenCalledWith('board-1');

    mocks.eventHandlers.get('SHOW_BOARD')?.();
    expect(mocks.replace).toHaveBeenCalledWith('Board', {});

    unmount();
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
  });
});
