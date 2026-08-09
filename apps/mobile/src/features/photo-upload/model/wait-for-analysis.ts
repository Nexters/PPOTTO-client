import type { AnalysisStatus } from './upload-runner';

const POLL_INTERVAL_MS = 2000;

type GetAnalysisStatus = (analysisId: string) => Promise<AnalysisStatus>;
type Wait = () => Promise<void>;

/** 서버 분석이 끝날 때까지 진행 상태를 조회한다. */
export async function waitForAnalysis(
  analysisId: string,
  getStatus: GetAnalysisStatus,
  wait: Wait = () => new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS)),
): Promise<void> {
  while (true) {
    const status = await getStatus(analysisId);
    if (status === 'COMPLETED') return;
    if (status === 'FAILED') throw new Error('사진 분석에 실패했습니다.');
    await wait();
  }
}
