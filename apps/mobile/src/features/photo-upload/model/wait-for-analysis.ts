import { HttpError, NetworkError } from '@ppotto/api';

import type { AnalysisStatus } from './upload-runner';

// 분석이 완료되거나 실패할 때까지 서버 상태를 폴링한다.
const POLL_INTERVAL_MS = 2000;

type GetAnalysisStatus = (analysisId: string) => Promise<AnalysisStatus>;
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
  getStatus: GetAnalysisStatus,
  wait: Wait = () => new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS)),
): Promise<void> {
  while (true) {
    const status = await getStatusWithRetry(analysisId, getStatus, wait);
    if (status === 'COMPLETED') return;
    if (status === 'FAILED') throw new Error('사진 분석에 실패했습니다.');
    await wait();
  }
}

async function getStatusWithRetry(
  analysisId: string,
  getStatus: GetAnalysisStatus,
  wait: Wait,
): Promise<AnalysisStatus> {
  try {
    return await getStatus(analysisId);
  } catch (error) {
    if (!isTemporaryError(error)) throw error;
  }

  await wait();
  try {
    return await getStatus(analysisId);
  } catch (error) {
    if (isTemporaryError(error)) throw new AnalysisStatusUnavailableError(error);
    throw error;
  }
}

function isTemporaryError(error: unknown) {
  return error instanceof NetworkError || (error instanceof HttpError && error.status >= 500);
}
