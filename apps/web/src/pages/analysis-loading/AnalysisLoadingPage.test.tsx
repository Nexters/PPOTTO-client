import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalysisLoadingPage } from './AnalysisLoadingPage';

interface MotionOptions {
  photoCount: number;
  speed: number;
  phase: string;
  photos: Array<{ src: string; ratio: number; capturedAt: null }>;
  onPhaseStarted: (phase: 'SCAN') => void;
  onPhaseFinished: (phase: 'SCAN') => Promise<unknown>;
  onRevealFinished: () => void;
}

const mocks = vi.hoisted(() => {
  const state = {
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
  const start = vi.fn();
  const destroy = vi.fn();
  const createLoadingMotion = vi.fn((_options: MotionOptions) => ({ start, destroy }));

  return { createLoadingMotion, destroy, nextState, request, send, start, state };
});

vi.mock('@/shared/lib/bridge', () => ({ bridge: { request: mocks.request, send: mocks.send } }));
vi.mock('./ppotto-loading-motion', () => ({ createLoadingMotion: mocks.createLoadingMotion }));

afterEach(() => vi.clearAllMocks());

describe('AnalysisLoadingPage', () => {
  it('RN 상태로 모션을 시작하고 막 경계와 종료를 브리지로 알린다', async () => {
    const { unmount } = render(<AnalysisLoadingPage />);

    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    const options = mocks.createLoadingMotion.mock.calls[0]![0];

    expect(options.speed).toBe(0.6);
    expect(options.phase).toBe('SCAN');
    expect(options.photoCount).toBe(20);
    expect(options.photos).toHaveLength(20);
    expect(options.photos[0]).toMatchObject({
      src: mocks.state.photos[0]!.uri,
      ratio: 0.75,
      capturedAt: null,
    });
    expect(mocks.send).toHaveBeenCalledWith('ANALYSIS_LOADING_READY');

    options.onPhaseStarted('SCAN');
    await expect(options.onPhaseFinished('SCAN')).resolves.toEqual(mocks.nextState);
    options.onRevealFinished();

    expect(mocks.send).toHaveBeenCalledWith('ANALYSIS_LOADING_PHASE_STARTED', { phase: 'SCAN' });
    expect(mocks.request).toHaveBeenCalledWith('ANALYSIS_LOADING_PHASE_FINISHED', {
      phase: 'SCAN',
    });
    expect(mocks.send).toHaveBeenCalledWith('ANALYSIS_LOADING_REVEAL_FINISHED');

    unmount();
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
  });
});
