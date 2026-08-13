import type { QaDiagnostic } from '@/shared/lib/qa-diagnostics';

import type { QaScreenRecordingClip } from '../../../../modules/qa-screen-recorder';

export type QaReportCategory = '기능' | '디자인';

export interface QaReportInput {
  title: string;
  category: QaReportCategory;
  currentBehavior: string;
  expectedBehavior: string;
}

export interface QaReport extends QaReportInput {
  reportedAt: string;
  buildNumber: string;
  video: QaScreenRecordingClip;
  diagnostics: QaDiagnostic[];
}

export type QaReportSeed = Pick<QaReport, 'reportedAt' | 'buildNumber' | 'video' | 'diagnostics'>;

export function isQaReportInputComplete(input: QaReportInput) {
  return [input.title, input.currentBehavior, input.expectedBehavior].every(
    (value) => value.trim().length > 0,
  );
}
