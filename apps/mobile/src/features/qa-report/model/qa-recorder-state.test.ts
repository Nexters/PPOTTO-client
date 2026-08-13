import {
  initialQaRecorderState,
  qaRecorderReducer,
  type QaRecorderState,
} from './qa-recorder-state';

it('녹화 준비부터 리포트 작성까지 정해진 순서로만 전환한다', () => {
  let state: QaRecorderState = initialQaRecorderState;

  state = qaRecorderReducer(state, { type: 'EXPORT_STARTED' });
  expect(state.status).toBe('starting');

  state = qaRecorderReducer(state, { type: 'RECORDING_STARTED' });
  state = qaRecorderReducer(state, { type: 'EXPORT_STARTED' });
  state = qaRecorderReducer(state, {
    type: 'EXPORT_SUCCEEDED',
    reportSeed: {
      reportedAt: '2026-08-12T12:00:00.000Z',
      buildNumber: '143',
      video: { uri: 'file:///qa.mp4', size: 1024 },
      diagnostics: [],
    },
  });
  expect(state.status).toBe('writing');

  state = qaRecorderReducer(state, { type: 'SUBMIT_STARTED' });
  expect(state.status).toBe('submitting');

  state = qaRecorderReducer(state, { type: 'SUBMIT_SUCCEEDED' });
  expect(state.status).toBe('ready');
});

it('백그라운드에서 중단된 녹화를 다시 준비한다', () => {
  let state = qaRecorderReducer(initialQaRecorderState, { type: 'RECORDING_STARTED' });

  state = qaRecorderReducer(state, { type: 'RECORDING_INTERRUPTED' });
  expect(state.status).toBe('starting');

  state = qaRecorderReducer(state, { type: 'RECORDING_STARTED' });
  expect(state.status).toBe('ready');
});
