/**
 * 분석 완료 대기 경계
 * - 진행 중 상태는 기다린 뒤 다시 조회
 * - COMPLETED가 되면 대기를 종료
 * - 일시적 상태 조회 오류는 한 번 재시도하고, 재차 실패하면 확인 불가로 종료
 */
import { NetworkError } from '@ppotto/api';

import { AnalysisStatusUnavailableError, waitForAnalysis } from './wait-for-analysis';

it('분석이 완료될 때까지 상태를 다시 조회한다', async () => {
  const getProgress = jest
    .fn()
    .mockResolvedValueOnce({ progress: 45, status: 'ANALYZING' })
    .mockResolvedValueOnce({ progress: 100, status: 'COMPLETED' });
  const wait = jest.fn(async () => undefined);
  const onProgress = jest.fn();

  await expect(
    waitForAnalysis('analysis-1', getProgress, wait, onProgress),
  ).resolves.toBeUndefined();

  expect(getProgress).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledTimes(1);
  expect(onProgress).toHaveBeenLastCalledWith({ progress: 100, status: 'COMPLETED' });
});

it('분석 실패 시 서버가 준 실패 사유를 전달한다', async () => {
  const getProgress = jest.fn().mockResolvedValue({
    failedReason: 'AI 분석 호출이 반복 실패했습니다.',
    progress: 45,
    status: 'FAILED',
  });

  await expect(waitForAnalysis('analysis-1', getProgress)).rejects.toThrow(
    'AI 분석 호출이 반복 실패했습니다.',
  );
});

it('상태 조회가 연속 두 번 실패하면 한 번만 재시도하고 확인 불가로 종료한다', async () => {
  const getProgress = jest.fn().mockRejectedValue(new NetworkError(new Error('offline')));
  const wait = jest.fn(async () => undefined);

  await expect(waitForAnalysis('analysis-1', getProgress, wait)).rejects.toBeInstanceOf(
    AnalysisStatusUnavailableError,
  );

  expect(getProgress).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledTimes(1);
});
