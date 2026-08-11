/**
 * 분석 완료 대기 경계
 * - 진행 중 상태는 기다린 뒤 다시 조회
 * - COMPLETED가 되면 대기를 종료
 * - 일시적 상태 조회 오류는 한 번 재시도하고, 재차 실패하면 확인 불가로 종료
 */
import { NetworkError } from '@ppotto/api';

import { AnalysisStatusUnavailableError, waitForAnalysis } from './wait-for-analysis';

it('분석이 완료될 때까지 상태를 다시 조회한다', async () => {
  const getStatus = jest.fn().mockResolvedValueOnce('ANALYZING').mockResolvedValueOnce('COMPLETED');
  const wait = jest.fn(async () => undefined);

  await expect(waitForAnalysis('analysis-1', getStatus, wait)).resolves.toBeUndefined();

  expect(getStatus).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledTimes(1);
});

it('상태 조회가 연속 두 번 실패하면 한 번만 재시도하고 확인 불가로 종료한다', async () => {
  const getStatus = jest.fn().mockRejectedValue(new NetworkError(new Error('offline')));
  const wait = jest.fn(async () => undefined);

  await expect(waitForAnalysis('analysis-1', getStatus, wait)).rejects.toBeInstanceOf(
    AnalysisStatusUnavailableError,
  );

  expect(getStatus).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledTimes(1);
});
