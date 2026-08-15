import { HttpError, NetworkError } from '@ppotto/api';

import type { AnalysisStatus } from './upload-runner';

// 분석이 완료되거나 실패할 때까지 서버 상태를 폴링한다.
const POLL_INTERVAL_MS = 2000;

export interface AnalysisProgress {
  failedReason?: string | null;
  progress: number;
  status: AnalysisStatus;
}

type GetAnalysisProgress = (analysisId: string) => Promise<AnalysisProgress>;
type Wait = () => Promise<void>;

export class AnalysisStatusUnavailableError extends Error {
  constructor(cause: unknown) {
    super('분석 상태를 확인하지 못했습니다.', { cause });
    this.name = 'AnalysisStatusUnavailableError';
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
    onProgress(analysis);
    if (analysis.status === 'COMPLETED') return;
    if (analysis.status === 'FAILED') {
      throw new Error(analysis.failedReason ?? '사진 분석에 실패했습니다.');
    }
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
    if (!isTemporaryError(error)) throw error;
  }

  await wait();
  try {
    return await getProgress(analysisId);
  } catch (error) {
    if (isTemporaryError(error)) throw new AnalysisStatusUnavailableError(error);
    throw error;
  }
}

function isTemporaryError(error: unknown) {
  return error instanceof NetworkError || (error instanceof HttpError && error.status >= 500);
}
