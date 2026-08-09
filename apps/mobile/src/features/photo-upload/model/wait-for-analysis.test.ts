/**
 * 분석 완료 대기 경계
 * - 진행 중 상태는 기다린 뒤 다시 조회
 * - COMPLETED가 되면 대기를 종료
 */
import { waitForAnalysis } from './wait-for-analysis';

it('분석이 완료될 때까지 상태를 다시 조회한다', async () => {
  const getStatus = jest.fn().mockResolvedValueOnce('ANALYZING').mockResolvedValueOnce('COMPLETED');
  const wait = jest.fn(async () => undefined);

  await expect(waitForAnalysis('analysis-1', getStatus, wait)).resolves.toBeUndefined();

  expect(getStatus).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledTimes(1);
});
