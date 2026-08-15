import { createLoadingSequence, loadingSequenceReducer } from './loading-sequence';
import type { LoadingPhase } from './loading-phase';

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
