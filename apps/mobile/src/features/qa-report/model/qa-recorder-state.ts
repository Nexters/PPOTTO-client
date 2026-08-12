import type { QaReportSeed } from './qa-report';

export type QaRecorderState =
  | { status: 'starting' }
  | { status: 'ready' }
  | { status: 'exporting' }
  | { status: 'writing'; reportSeed: QaReportSeed }
  | { status: 'submitting'; reportSeed: QaReportSeed }
  | { status: 'unavailable' };

export type QaRecorderEvent =
  | { type: 'RECORDING_STARTED' }
  | { type: 'RECORDING_FAILED' }
  | { type: 'EXPORT_STARTED' }
  | { type: 'EXPORT_SUCCEEDED'; reportSeed: QaReportSeed }
  | { type: 'EXPORT_FAILED' }
  | { type: 'REPORT_CLOSED' }
  | { type: 'SUBMIT_STARTED' }
  | { type: 'SUBMIT_SUCCEEDED' }
  | { type: 'SUBMIT_FAILED' };

export const initialQaRecorderState: QaRecorderState = { status: 'starting' };

export function qaRecorderReducer(state: QaRecorderState, event: QaRecorderEvent): QaRecorderState {
  switch (event.type) {
    case 'RECORDING_STARTED':
      return state.status === 'starting' ? { status: 'ready' } : state;
    case 'RECORDING_FAILED':
      return state.status === 'starting' ? { status: 'unavailable' } : state;
    case 'EXPORT_STARTED':
      return state.status === 'ready' ? { status: 'exporting' } : state;
    case 'EXPORT_SUCCEEDED':
      return state.status === 'exporting'
        ? { status: 'writing', reportSeed: event.reportSeed }
        : state;
    case 'EXPORT_FAILED':
      return state.status === 'exporting' ? { status: 'ready' } : state;
    case 'REPORT_CLOSED':
      return state.status === 'writing' ? { status: 'ready' } : state;
    case 'SUBMIT_STARTED':
      return state.status === 'writing'
        ? { status: 'submitting', reportSeed: state.reportSeed }
        : state;
    case 'SUBMIT_SUCCEEDED':
      return state.status === 'submitting' ? { status: 'ready' } : state;
    case 'SUBMIT_FAILED':
      return state.status === 'submitting'
        ? { status: 'writing', reportSeed: state.reportSeed }
        : state;
  }
}
