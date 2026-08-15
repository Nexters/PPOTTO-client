import { loadingPhaseFor, nextLoadingPhase, phaseIndex, type LoadingPhase } from './loading-phase';

// 막의 소속 범위가 아니라 progress bar의 인계 지점이다. 이전 막의 end를 다음 막이 이어받는다.
const VISUAL_PROGRESS_HANDOFF = {
  SCAN: { start: 0, end: 25 },
  GROUP: { start: 25, end: 50 },
  ASSEMBLE: { start: 50, end: 75 },
  DECK: { start: 75, end: 99 },
  REVEAL: { start: 99, end: 99 },
} satisfies Record<LoadingPhase, { start: number; end: number }>;

export interface LoadingSequenceState {
  serverProgress: number;
  targetPhase: LoadingPhase;
  visiblePhase: LoadingPhase;
  visualProgress: number;
  revealFinished: boolean;
}

export type LoadingSequenceAction =
  | { type: 'SERVER_PROGRESS_UPDATED'; progress: number }
  | { type: 'PHASE_FINISHED'; phase: LoadingPhase }
  | { type: 'REVEAL_FINISHED' };

export function createLoadingSequence({
  serverProgress,
  lastSeenPhase = 'SCAN',
}: {
  serverProgress: number;
  lastSeenPhase?: LoadingPhase;
}): LoadingSequenceState {
  const progress = clampProgress(serverProgress);
  const targetPhase = loadingPhaseFor(progress);

  return {
    serverProgress: progress,
    targetPhase,
    visiblePhase: lastSeenPhase,
    visualProgress: visualProgressFor(lastSeenPhase, targetPhase, progress),
    revealFinished: false,
  };
}

export function loadingSequenceReducer(
  state: LoadingSequenceState,
  action: LoadingSequenceAction,
): LoadingSequenceState {
  if (state.revealFinished) return state;

  if (action.type === 'SERVER_PROGRESS_UPDATED') {
    const serverProgress = Math.max(state.serverProgress, clampProgress(action.progress));
    const targetPhase = loadingPhaseFor(serverProgress);
    return {
      ...state,
      serverProgress,
      targetPhase,
      visualProgress: visualProgressFor(state.visiblePhase, targetPhase, serverProgress),
    };
  }

  if (action.type === 'PHASE_FINISHED') {
    if (
      action.phase !== state.visiblePhase ||
      phaseIndex(state.targetPhase) <= phaseIndex(state.visiblePhase)
    ) {
      return state;
    }

    const visiblePhase = nextLoadingPhase(state.visiblePhase);
    if (!visiblePhase) return state;

    return {
      ...state,
      visiblePhase,
      visualProgress: visualProgressFor(visiblePhase, state.targetPhase, state.serverProgress),
    };
  }

  if (state.visiblePhase !== 'REVEAL' || state.targetPhase !== 'REVEAL') return state;
  return { ...state, visualProgress: 100, revealFinished: true };
}

function visualProgressFor(
  visiblePhase: LoadingPhase,
  targetPhase: LoadingPhase,
  serverProgress: number,
) {
  const { start, end } = VISUAL_PROGRESS_HANDOFF[visiblePhase];
  const distance = phaseIndex(targetPhase) - phaseIndex(visiblePhase);
  if (distance > 0) return end;
  if (distance < 0) return start;
  return Math.min(end, Math.max(start, serverProgress));
}

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, progress));
}
