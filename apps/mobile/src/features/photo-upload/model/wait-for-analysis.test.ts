/**
 * 분석 완료 대기 경계
 * - 진행 중 상태는 기다린 뒤 다시 조회
 * - COMPLETED가 되면 대기를 종료
 * - 일시적 상태 조회 오류는 한 번 재시도하고, 재차 실패하면 서버 오류로 분류
 */
import { HttpError, NetworkError } from '@ppotto/api';

import { AnalysisPollingError, waitForAnalysis } from './wait-for-analysis';

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

it('200 응답의 분석 실패를 실패 코드와 함께 구분한다', async () => {
  const getProgress = jest.fn().mockResolvedValue({
    failureCode: 'AI-001',
    failedReason: 'AI 분석 호출이 반복 실패했습니다.',
    progress: 45,
    status: 'FAILED',
  });

  await expect(waitForAnalysis('analysis-1', getProgress)).rejects.toMatchObject({
    code: 'AI-001',
    kind: 'analysis-failed',
    message: 'AI 분석 호출이 반복 실패했습니다.',
  });
});

it('4xx는 재시도하지 않고 에러 코드를 보존한다', async () => {
  const getProgress = jest
    .fn()
    .mockRejectedValue(new HttpError(404, 'ANALYSIS-005', { message: 'not found' }));
  const wait = jest.fn(async () => undefined);

  await expect(waitForAnalysis('analysis-1', getProgress, wait)).rejects.toMatchObject({
    code: 'ANALYSIS-005',
    kind: 'client-error',
    status: 404,
  });

  expect(getProgress).toHaveBeenCalledTimes(1);
  expect(wait).not.toHaveBeenCalled();
});

it.each([
  ['네트워크 오류', new NetworkError(new Error('offline'))],
  ['서버 5xx', new HttpError(503, 'COMMON-000', { message: 'unavailable' })],
])('%s가 연속 두 번 발생하면 한 번 재시도하고 서버 오류로 구분한다', async (_, error) => {
  const getProgress = jest.fn().mockRejectedValue(error);
  const wait = jest.fn(async () => undefined);

  await expect(waitForAnalysis('analysis-1', getProgress, wait)).rejects.toEqual(
    expect.objectContaining<Partial<AnalysisPollingError>>({ kind: 'server-error' }),
  );

  expect(getProgress).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledTimes(1);
});

it('서버 5xx 재시도가 성공하면 폴링을 정상 종료한다', async () => {
  const getProgress = jest
    .fn()
    .mockRejectedValueOnce(new HttpError(500, 'COMMON-000', {}))
    .mockResolvedValueOnce({ progress: 100, status: 'COMPLETED' });
  const wait = jest.fn(async () => undefined);

  await expect(waitForAnalysis('analysis-1', getProgress, wait)).resolves.toBeUndefined();
  expect(getProgress).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledTimes(1);
});
