/**
 * 업로드 실행 및 재실행 복구 시나리오
 * - PUTTING 재개 → URL 재발급 후 완료되지 않은 사진만 업로드
 * - GCS 403 → 새 URL로 1회 재시도
 * - 네트워크 오류·GCS 5xx → 같은 URL로 1회 재시도
 * - 재시도 최종 실패 → 취소 의도 저장, 분석 취소, 로컬 작업 정리
 * - CANCELING 재개 → 취소 실패 시 작업 유지, 성공 시 작업 정리
 * - STARTING 재개 + 서버 UPLOADING → 분석 시작 재요청
 * - STARTING 재개 + 서버 ANALYZING → 중복 시작 없이 로컬 작업 정리
 */
import type { UploadJobEvent, UploadJobState } from './upload-job';
import {
  resumePhotoUpload,
  type PutPhotoResult,
  type UploadRunnerDependencies,
} from './upload-runner';

function state(phase: UploadJobState['phase'], uploadedPhotoIds: string[] = []): UploadJobState {
  return {
    snapshot: {
      jobId: 'job-1',
      boardId: 'board-1',
      groups: [
        {
          items: [
            {
              clientPhotoId: 'local-a',
              fileUri: 'file:///a.jpg',
              contentType: 'image/jpeg',
              takenAt: '2026-08-09T00:00:00.000Z',
              isRepresentative: true,
            },
            {
              clientPhotoId: 'local-b',
              fileUri: 'file:///b.jpg',
              contentType: 'image/jpeg',
              takenAt: '2026-08-09T00:01:00.000Z',
              isRepresentative: false,
            },
          ],
        },
      ],
    },
    phase,
    analysisId: 'analysis-1',
    photoIds: { 'local-a': 'server-a', 'local-b': 'server-b' },
    uploadedPhotoIds: new Set(uploadedPhotoIds),
  };
}

function setup() {
  const dependencies: jest.Mocked<UploadRunnerDependencies> = {
    appendEvent: jest.fn<Promise<void>, [UploadJobEvent]>(async () => undefined),
    cancelAnalysis: jest.fn<Promise<void>, [string]>(async () => undefined),
    clearJob: jest.fn<Promise<void>, []>(async () => undefined),
    getAnalysisStatus: jest.fn<ReturnType<UploadRunnerDependencies['getAnalysisStatus']>, [string]>(
      async () => 'UPLOADING',
    ),
    putPhoto: jest.fn<
      Promise<PutPhotoResult>,
      [Parameters<UploadRunnerDependencies['putPhoto']>[0]]
    >(async () => ({ ok: true })),
    reissueUploadUrls: jest.fn<ReturnType<UploadRunnerDependencies['reissueUploadUrls']>, [string]>(
      async () => [
        { photoId: 'server-a', uploadUrl: 'https://upload/a' },
        { photoId: 'server-b', uploadUrl: 'https://upload/b' },
      ],
    ),
    startAnalysis: jest.fn<Promise<void>, [string]>(async () => undefined),
  };

  return dependencies;
}

it('PUTTING을 재개하면 URL을 재발급하고 성공 기록이 없는 사진만 업로드한다', async () => {
  const dependencies = setup();
  const completionCalls: string[] = [];
  dependencies.appendEvent.mockImplementation(async (event) => {
    if (event.type === 'START_REQUESTED') completionCalls.push('start-requested');
  });
  dependencies.startAnalysis.mockImplementation(async () => {
    completionCalls.push('start-analysis');
  });
  dependencies.clearJob.mockImplementation(async () => {
    completionCalls.push('clear-job');
  });

  const result = await resumePhotoUpload(state('PUTTING', ['server-a']), dependencies);

  expect(result).toBe('ANALYZING');
  expect(dependencies.reissueUploadUrls).toHaveBeenCalledWith('analysis-1');
  expect(dependencies.putPhoto).toHaveBeenCalledTimes(1);
  expect(dependencies.putPhoto).toHaveBeenCalledWith({
    fileUri: 'file:///b.jpg',
    uploadUrl: 'https://upload/b',
    contentType: 'image/jpeg',
  });
  expect(dependencies.appendEvent).toHaveBeenCalledWith({
    type: 'PHOTO_UPLOADED',
    photoId: 'server-b',
  });
  expect(dependencies.appendEvent).toHaveBeenCalledWith({ type: 'START_REQUESTED' });
  expect(dependencies.startAnalysis).toHaveBeenCalledWith('analysis-1');
  expect(completionCalls).toEqual(['start-requested', 'start-analysis', 'clear-job']);
});

const retryScenarios = [
  {
    reason: 'FORBIDDEN',
    expectedUrls: ['https://upload/first', 'https://upload/fresh'],
    reissueCount: 2,
  },
  {
    reason: 'NETWORK',
    expectedUrls: ['https://upload/first', 'https://upload/first'],
    reissueCount: 1,
  },
  {
    reason: 'SERVER',
    expectedUrls: ['https://upload/first', 'https://upload/first'],
    reissueCount: 1,
  },
] satisfies {
  reason: Extract<PutPhotoResult, { ok: false }>['reason'];
  expectedUrls: string[];
  reissueCount: number;
}[];

it.each(retryScenarios)(
  '$reason 실패는 정해진 URL 정책으로 한 번 재시도한다',
  async ({ expectedUrls, reason, reissueCount }) => {
    const dependencies = setup();
    dependencies.reissueUploadUrls
      .mockResolvedValueOnce([{ photoId: 'server-a', uploadUrl: 'https://upload/first' }])
      .mockResolvedValueOnce([{ photoId: 'server-a', uploadUrl: 'https://upload/fresh' }]);
    dependencies.putPhoto
      .mockResolvedValueOnce({ ok: false, reason })
      .mockResolvedValueOnce({ ok: true });
    const onePhoto = state('PUTTING');
    onePhoto.snapshot.groups[0]!.items = onePhoto.snapshot.groups[0]!.items.slice(0, 1);
    onePhoto.photoIds = { 'local-a': 'server-a' };

    await resumePhotoUpload(onePhoto, dependencies);

    expect(dependencies.reissueUploadUrls).toHaveBeenCalledTimes(reissueCount);
    expect(dependencies.putPhoto.mock.calls.map(([input]) => input.uploadUrl)).toEqual(
      expectedUrls,
    );
    expect(
      dependencies.putPhoto.mock.calls.every(([input]) => input.contentType === 'image/jpeg'),
    ).toBe(true);
    expect(dependencies.cancelAnalysis).not.toHaveBeenCalled();
  },
);

it('여러 사진이 동시에 403이면 새 URL을 한 번만 재발급한다', async () => {
  const dependencies = setup();
  dependencies.reissueUploadUrls
    .mockResolvedValueOnce([
      { photoId: 'server-a', uploadUrl: 'https://upload/old-a' },
      { photoId: 'server-b', uploadUrl: 'https://upload/old-b' },
    ])
    .mockResolvedValue([
      { photoId: 'server-a', uploadUrl: 'https://upload/fresh-a' },
      { photoId: 'server-b', uploadUrl: 'https://upload/fresh-b' },
    ]);
  dependencies.putPhoto.mockImplementation(async ({ uploadUrl }) =>
    uploadUrl.includes('/old-') ? { ok: false, reason: 'FORBIDDEN' } : { ok: true },
  );

  await resumePhotoUpload(state('PUTTING'), dependencies);

  expect(dependencies.reissueUploadUrls).toHaveBeenCalledTimes(2);
  expect(dependencies.putPhoto.mock.calls.map(([input]) => input.uploadUrl)).toEqual(
    expect.arrayContaining(['https://upload/fresh-a', 'https://upload/fresh-b']),
  );
});

it('재시도까지 실패하면 취소 의도를 먼저 저장하고 분석을 취소하며 시작하지 않는다', async () => {
  const dependencies = setup();
  const calls: string[] = [];
  dependencies.appendEvent.mockImplementation(async (event) => {
    if (event.type === 'CANCEL_REQUESTED') calls.push('cancel-requested');
  });
  dependencies.cancelAnalysis.mockImplementation(async () => {
    calls.push('cancel-analysis');
  });
  dependencies.clearJob.mockImplementation(async () => {
    calls.push('clear-job');
  });
  dependencies.reissueUploadUrls.mockResolvedValue([
    { photoId: 'server-a', uploadUrl: 'https://upload/a' },
  ]);
  dependencies.putPhoto.mockResolvedValue({ ok: false, reason: 'NETWORK' });
  const onePhoto = state('PUTTING');
  onePhoto.snapshot.groups[0]!.items = onePhoto.snapshot.groups[0]!.items.slice(0, 1);
  onePhoto.photoIds = { 'local-a': 'server-a' };

  const result = await resumePhotoUpload(onePhoto, dependencies);

  expect(result).toBe('UPLOAD_FAILED');
  expect(calls).toEqual(['cancel-requested', 'cancel-analysis', 'clear-job']);
  expect(dependencies.startAnalysis).not.toHaveBeenCalled();
});

it('CANCELING에서 분석 취소가 실패하면 작업을 유지한다', async () => {
  const dependencies = setup();
  dependencies.cancelAnalysis.mockRejectedValueOnce(new Error('offline'));

  const result = await resumePhotoUpload(state('CANCELING'), dependencies);

  expect(result).toBe('RETRY_CANCEL');
  expect(dependencies.cancelAnalysis).toHaveBeenCalledWith('analysis-1');
  expect(dependencies.clearJob).not.toHaveBeenCalled();
});

it('CANCELING에서 분석 취소가 성공하면 작업을 정리하고 업로드를 재개하지 않는다', async () => {
  const dependencies = setup();

  const result = await resumePhotoUpload(state('CANCELING'), dependencies);

  expect(result).toBe('UPLOAD_FAILED');
  expect(dependencies.cancelAnalysis).toHaveBeenCalledWith('analysis-1');
  expect(dependencies.clearJob).toHaveBeenCalledTimes(1);
  expect(dependencies.reissueUploadUrls).not.toHaveBeenCalled();
  expect(dependencies.putPhoto).not.toHaveBeenCalled();
  expect(dependencies.startAnalysis).not.toHaveBeenCalled();
});

it('STARTING을 재개했는데 서버가 UPLOADING이면 분석 시작을 다시 요청한다', async () => {
  const dependencies = setup();
  const calls: string[] = [];
  dependencies.getAnalysisStatus.mockImplementation(async () => {
    calls.push('get-status');
    return 'UPLOADING';
  });
  dependencies.startAnalysis.mockImplementation(async () => {
    calls.push('start-analysis');
  });
  dependencies.clearJob.mockImplementation(async () => {
    calls.push('clear-job');
  });

  const result = await resumePhotoUpload(state('STARTING'), dependencies);

  expect(result).toBe('ANALYZING');
  expect(calls).toEqual(['get-status', 'start-analysis', 'clear-job']);
});

it('STARTING을 재개하면 서버 상태를 먼저 확인하고 이미 시작된 분석을 다시 시작하지 않는다', async () => {
  const dependencies = setup();
  dependencies.getAnalysisStatus.mockResolvedValue('ANALYZING');

  const result = await resumePhotoUpload(state('STARTING'), dependencies);

  expect(result).toBe('ANALYZING');
  expect(dependencies.getAnalysisStatus).toHaveBeenCalledWith('analysis-1');
  expect(dependencies.startAnalysis).not.toHaveBeenCalled();
  expect(dependencies.clearJob).toHaveBeenCalledTimes(1);
});
