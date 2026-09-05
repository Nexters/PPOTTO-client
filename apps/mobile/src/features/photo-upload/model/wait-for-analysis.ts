import { HttpError, NetworkError } from '@ppotto/api';

import type { AnalysisStatus } from './upload-runner';

// 분석이 완료되거나 실패할 때까지 서버 상태를 폴링한다.
const POLL_INTERVAL_MS = 2000;

export interface AnalysisProgress {
  failureCode?: string | null;
  failedReason?: string | null;
  progress: number;
  status: AnalysisStatus;
}

type GetAnalysisProgress = (analysisId: string) => Promise<AnalysisProgress>;
type Wait = () => Promise<void>;

export type AnalysisFailureKind = 'analysis-failed' | 'client-error' | 'server-error';

export class AnalysisPollingError extends Error {
  readonly code: string | undefined;
  readonly status: number | undefined;

  constructor(
    readonly kind: AnalysisFailureKind,
    message: string,
    { cause, code, status }: { cause?: unknown; code?: string; status?: number } = {},
  ) {
    super(message, { cause });
    this.name = 'AnalysisPollingError';
    this.code = code;
    this.status = status;
  }
}

/** 서버 분석이 끝날 때까지 진행 상태를 조회한다. */
export async function waitForAnalysis(
  analysisId: string,
  getProgress: GetAnalysisProgress,
  wait: Wait = () => new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS)),
  onProgress: (progress: AnalysisProgress) => void = () => undefined,
): Promise<void> {
  while (true) {
    const analysis = await getProgressWithRetry(analysisId, getProgress, wait);
    if (analysis.status === 'FAILED') {
      throw new AnalysisPollingError(
        'analysis-failed',
        analysis.failedReason ?? '사진 분석에 실패했습니다.',
        { code: analysis.failureCode ?? undefined },
      );
    }
    onProgress(analysis);
    if (analysis.status === 'COMPLETED') return;
    await wait();
  }
}

async function getProgressWithRetry(
  analysisId: string,
  getProgress: GetAnalysisProgress,
  wait: Wait,
): Promise<AnalysisProgress> {
  try {
    return await getProgress(analysisId);
  } catch (error) {
    if (!isTemporaryError(error)) throw normalizePollingError(error);
  }

  await wait();
  try {
    return await getProgress(analysisId);
  } catch (error) {
    throw normalizePollingError(error);
  }
}

function isTemporaryError(error: unknown) {
  return error instanceof NetworkError || (error instanceof HttpError && error.status >= 500);
}

function normalizePollingError(error: unknown) {
  if (error instanceof AnalysisPollingError) return error;
  if (error instanceof HttpError) {
    return new AnalysisPollingError(
      error.status >= 400 && error.status < 500 ? 'client-error' : 'server-error',
      error.message,
      { cause: error, code: error.code, status: error.status },
    );
  }
  if (error instanceof NetworkError) {
    return new AnalysisPollingError('server-error', error.message, { cause: error });
  }
  return error;
}
