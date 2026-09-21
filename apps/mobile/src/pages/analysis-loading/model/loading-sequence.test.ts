import { createLoadingSequence, loadingSequenceReducer } from './loading-sequence';
import type { LoadingPhase } from './loading-phase';

it('복구 시 이미 완료된 분석은 완료 화면 상태로 시작한다', () => {
  expect(createLoadingSequence({ serverProgress: 100, completed: true })).toEqual({
    serverProgress: 100,
    targetPhase: 'REVEAL',
    visiblePhase: 'REVEAL',
    visualProgress: 100,
    revealFinished: true,
  });
});

it('서버가 완료됐어도 현재 막부터 모든 막을 한 번씩 마친 뒤 REVEAL을 끝낸다', () => {
  let state = createLoadingSequence({ serverProgress: 100 });
  const played: LoadingPhase[] = [state.visiblePhase];

  for (const phase of ['SCAN', 'GROUP', 'ASSEMBLE', 'DECK'] as const) {
    state = loadingSequenceReducer(state, { type: 'PHASE_FINISHED', phase });
    played.push(state.visiblePhase);
  }

  expect(played).toEqual(['SCAN', 'GROUP', 'ASSEMBLE', 'DECK', 'REVEAL']);
  expect(state.visualProgress).toBe(99);
  expect(state.revealFinished).toBe(false);

  state = loadingSequenceReducer(state, { type: 'REVEAL_FINISHED' });

  expect(state.visualProgress).toBe(100);
  expect(state.revealFinished).toBe(true);

  expect(loadingSequenceReducer(state, { type: 'SERVER_PROGRESS_UPDATED', progress: 80 })).toBe(
    state,
  );
});

it('재접속하면 마지막으로 본 막을 다시 재생하고 다음 막부터 순서대로 진행한다', () => {
  let state = createLoadingSequence({ serverProgress: 100, lastSeenPhase: 'GROUP' });

  expect(state.visiblePhase).toBe('GROUP');
  state = loadingSequenceReducer(state, { type: 'PHASE_FINISHED', phase: 'GROUP' });
  expect(state.visiblePhase).toBe('ASSEMBLE');
  state = loadingSequenceReducer(state, { type: 'PHASE_FINISHED', phase: 'ASSEMBLE' });
  expect(state.visiblePhase).toBe('DECK');
});

it('현재 막보다 서버가 앞서지 않으면 막을 반복하고 progress도 뒤로 가지 않는다', () => {
  let state = createLoadingSequence({ serverProgress: 20 });

  state = loadingSequenceReducer(state, { type: 'PHASE_FINISHED', phase: 'SCAN' });
  expect(state.visiblePhase).toBe('SCAN');

  state = loadingSequenceReducer(state, { type: 'SERVER_PROGRESS_UPDATED', progress: 10 });
  expect(state.serverProgress).toBe(20);
  expect(state.visualProgress).toBe(20);

  state = loadingSequenceReducer(state, { type: 'SERVER_PROGRESS_UPDATED', progress: 30 });
  expect(state.targetPhase).toBe('GROUP');
  expect(state.visualProgress).toBe(25);
});

it('포그라운드 복귀 시 완료 상태면 중간 막을 재생하지 않고 바로 REVEAL을 끝낸다', () => {
  const state = createLoadingSequence({ serverProgress: 20 });

  const resynced = loadingSequenceReducer(state, {
    type: 'FOREGROUND_RESYNCED',
    progress: 100,
    completed: true,
  });

  expect(resynced.visiblePhase).toBe('REVEAL');
  expect(resynced.visualProgress).toBe(100);
  expect(resynced.revealFinished).toBe(true);
});

it('포그라운드 복귀 시 진행 중이면 중간 막을 재생하지 않고 서버 단계로 바로 이동한다', () => {
  const state = createLoadingSequence({ serverProgress: 0 });

  const resynced = loadingSequenceReducer(state, {
    type: 'FOREGROUND_RESYNCED',
    progress: 60,
    completed: false,
  });

  expect(resynced.visiblePhase).toBe(resynced.targetPhase);
  expect(resynced.visiblePhase).not.toBe('SCAN');
  expect(resynced.revealFinished).toBe(false);
});

it('포그라운드 복귀로 진행률이 뒤로 가지 않는다', () => {
  const state = createLoadingSequence({ serverProgress: 60 });

  const resynced = loadingSequenceReducer(state, {
    type: 'FOREGROUND_RESYNCED',
    progress: 30,
    completed: false,
  });

  expect(resynced.serverProgress).toBe(60);
});

it('REVEAL이 끝난 뒤에는 포그라운드 복귀로도 상태가 바뀌지 않는다', () => {
  let state = createLoadingSequence({ serverProgress: 100 });
  for (const phase of ['SCAN', 'GROUP', 'ASSEMBLE', 'DECK'] as const) {
    state = loadingSequenceReducer(state, { type: 'PHASE_FINISHED', phase });
  }
  state = loadingSequenceReducer(state, { type: 'REVEAL_FINISHED' });

  expect(
    loadingSequenceReducer(state, { type: 'FOREGROUND_RESYNCED', progress: 50, completed: false }),
  ).toBe(state);
});
