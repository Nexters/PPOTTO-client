import type { PhotoUploadServiceDependencies } from './model/start-photo-upload';

const mockLoadJob = jest.fn();

jest.mock('@/shared/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/entities/analysis/api/analysis-api', () => ({
  analysisApi: {
    create: jest.fn(),
    get: jest.fn(),
    getActive: jest.fn(),
    start: jest.fn(),
    cancel: jest.fn(),
  },
}));
jest.mock('./api/put-photo', () => ({ putPhoto: jest.fn(async () => ({ ok: true })) }));
jest.mock('./lib/photo-upload-log', () => ({
  logPhotoUpload: jest.fn(),
  logPhotoUploadError: jest.fn(),
}));
jest.mock('./lib/expo-upload-file-system', () => ({
  PHOTO_UPLOAD_ROOT_URI: 'file:///test',
  ANALYSIS_LOADING_PHASE_URI: 'file:///phase',
  expoUploadFileSystem: {
    writeText: jest.fn(),
    readText: jest.fn(),
    deletePathIfExists: jest.fn(),
  },
}));
jest.mock('./model/upload-storage', () => ({
  createUploadJobStorage: () => ({ loadJob: mockLoadJob, clearJob: jest.fn() }),
}));
jest.mock('./model/start-photo-upload', () => ({
  startPhotoUpload: jest.fn(),
  resumeSavedPhotoUpload: jest.fn(async () => null),
  discardSavedPhotoUpload: jest.fn(),
}));

function setup() {
  jest.resetModules();
  mockLoadJob.mockReset().mockResolvedValue(null);
  const { analysisApi } = jest.requireMock('@/entities/analysis/api/analysis-api') as {
    analysisApi: {
      create: jest.Mock;
      get: jest.Mock;
      getActive: jest.Mock;
      start: jest.Mock;
      cancel: jest.Mock;
    };
  };
  const { startPhotoUpload, discardSavedPhotoUpload } = jest.requireMock(
    './model/start-photo-upload',
  ) as {
    startPhotoUpload: jest.Mock;
    discardSavedPhotoUpload: jest.Mock;
  };
  const { photoUploadService } =
    jest.requireActual<typeof import('./photo-upload-service')>('./photo-upload-service');

  // createAnalysis를 실제로 거치게 해 그 안의 setAnalysisId 호출을 검증
  startPhotoUpload.mockImplementation(
    async (_job: unknown, dependencies: PhotoUploadServiceDependencies) => {
      const created = await dependencies.createAnalysis({ boardId: 'board-1', photos: [] });
      return { analysisId: created.analysisId, status: 'ANALYZING' as const };
    },
  );

  const start = (jobId = 'job-1') =>
    photoUploadService.start({
      jobId,
      photoCount: 1,
      motionPhotos: Promise.resolve([]),
      prepareJob: async () => ({ jobId, boardId: 'board-1', groups: [] }),
    });

  return { analysisApi, photoUploadService, start, startPhotoUpload, discardSavedPhotoUpload };
}

it('분석 생성 직후, 업로드가 끝나기 전에도 analysisId를 확인할 수 있다', async () => {
  const { analysisApi, photoUploadService, start, startPhotoUpload } = setup();
  analysisApi.create.mockResolvedValue({ analysisId: 'analysis-1', uploads: [] });
  analysisApi.get.mockResolvedValue({
    id: 'analysis-1',
    status: 'COMPLETED',
    progress: 100,
    notificationRequested: false,
  });

  let releaseUpload: () => void = () => undefined;
  const uploadGate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });
  let reachedGate: () => void = () => undefined;
  const reachedGatePromise = new Promise<void>((resolve) => {
    reachedGate = resolve;
  });
  startPhotoUpload.mockImplementation(
    async (_job: unknown, dependencies: PhotoUploadServiceDependencies) => {
      const created = await dependencies.createAnalysis({ boardId: 'board-1', photos: [] });
      reachedGate();
      await uploadGate;
      return { analysisId: created.analysisId, status: 'ANALYZING' as const };
    },
  );

  const promise = start();
  await reachedGatePromise;

  expect(photoUploadService.getViewState().analysisId).toBe('analysis-1');
  expect(photoUploadService.getViewState().notificationRequested).toBe(false);

  releaseUpload();
  await promise;
});

it('새 분석을 시작하면, 폴링 응답 전에도 이전 분석의 신청 상태를 물려받지 않는다', async () => {
  const { analysisApi, photoUploadService, start } = setup();
  analysisApi.create.mockResolvedValueOnce({ analysisId: 'analysis-1', uploads: [] });
  analysisApi.get.mockResolvedValue({
    id: 'analysis-1',
    status: 'COMPLETED',
    progress: 100,
    notificationRequested: true,
  });
  await start('job-1');
  expect(photoUploadService.getViewState().notificationRequested).toBe(true);

  analysisApi.create.mockResolvedValueOnce({ analysisId: 'analysis-2', uploads: [] });
  let releasePoll: () => void = () => undefined;
  const pollGate = new Promise<void>((resolve) => {
    releasePoll = resolve;
  });
  let reachedPoll: () => void = () => undefined;
  const reachedPollPromise = new Promise<void>((resolve) => {
    reachedPoll = resolve;
  });
  analysisApi.get.mockImplementation(async () => {
    reachedPoll();
    await pollGate;
    return {
      id: 'analysis-2',
      status: 'COMPLETED' as const,
      progress: 100,
      notificationRequested: false,
    };
  });

  const promise = start('job-2');
  await reachedPollPromise;

  expect(photoUploadService.getViewState()).toMatchObject({
    analysisId: 'analysis-2',
    notificationRequested: false,
  });

  releasePoll();
  await promise;
});

it('재진입 직후, 폴링 응답 전에도 서버의 신청 상태를 즉시 반영한다', async () => {
  const { analysisApi, photoUploadService } = setup();
  analysisApi.getActive.mockResolvedValue({
    id: 'analysis-1',
    status: 'ANALYZING',
    progress: 40,
    notificationRequested: true,
  });

  let releasePoll: () => void = () => undefined;
  const pollGate = new Promise<void>((resolve) => {
    releasePoll = resolve;
  });
  let reachedPoll: () => void = () => undefined;
  const reachedPollPromise = new Promise<void>((resolve) => {
    reachedPoll = resolve;
  });
  analysisApi.get.mockImplementation(async () => {
    reachedPoll();
    await pollGate;
    return {
      id: 'analysis-1',
      status: 'COMPLETED' as const,
      progress: 100,
      notificationRequested: true,
    };
  });

  const promise = photoUploadService.resume();
  await reachedPollPromise;

  expect(photoUploadService.getViewState()).toMatchObject({
    analysisId: 'analysis-1',
    notificationRequested: true,
  });

  releasePoll();
  await promise;
});

it.each([
  ['DISCARDED', null, false, false, null, 0],
  ['NO_LONGER_ACTIVE', 'analysis-1', true, true, 'job-1', 1],
  ['RETRY', 'analysis-1', true, true, 'job-1', 1],
] as const)(
  '폐기 결과가 %s이면 분석 정보를 그에 맞게 처리한다',
  async (result, analysisId, notificationRequested, hasCurrent, jobId, photoCount) => {
    const { analysisApi, photoUploadService, start, discardSavedPhotoUpload } = setup();
    analysisApi.create.mockResolvedValue({ analysisId: 'analysis-1', uploads: [] });
    analysisApi.get.mockResolvedValue({
      id: 'analysis-1',
      status: 'COMPLETED',
      progress: 100,
      notificationRequested: true,
    });
    await start();
    expect(photoUploadService.getViewState().analysisId).toBe('analysis-1');

    discardSavedPhotoUpload.mockResolvedValue(result);
    await photoUploadService.discard();

    expect(discardSavedPhotoUpload).toHaveBeenCalledWith(expect.any(Object), 'analysis-1');
    expect(photoUploadService.getViewState()).toMatchObject({ analysisId, notificationRequested });
    expect(photoUploadService.getCurrent() !== null).toBe(hasCurrent);
    expect(photoUploadService.getCurrentJobId()).toBe(jobId);
    expect(photoUploadService.getMotionPhotoCount()).toBe(photoCount);
  },
);

it('취소된 작업의 지연 실패를 무시한다', async () => {
  const { analysisApi, photoUploadService, start, discardSavedPhotoUpload } = setup();
  const { logPhotoUploadError } = jest.requireMock('./lib/photo-upload-log') as {
    logPhotoUploadError: jest.Mock;
  };
  analysisApi.create.mockResolvedValue({ analysisId: 'analysis-1', uploads: [] });

  let resolvePoll: (analysis: {
    id: string;
    notificationRequested: boolean;
    progress: number;
    status: 'FAILED';
  }) => void = () => undefined;
  let reachedPoll: () => void = () => undefined;
  const reachedPollPromise = new Promise<void>((resolve) => {
    reachedPoll = resolve;
  });
  analysisApi.get.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolvePoll = resolve;
        reachedPoll();
      }),
  );

  const upload = start();
  await reachedPollPromise;
  discardSavedPhotoUpload.mockResolvedValue('DISCARDED');
  await photoUploadService.discard();

  resolvePoll({
    id: 'analysis-1',
    notificationRequested: false,
    progress: 100,
    status: 'FAILED',
  });
  await expect(upload).rejects.toThrow();

  expect(photoUploadService.getViewState()).toMatchObject({
    analysisId: null,
    progress: 0,
    status: 'UPLOADING',
  });
  expect(logPhotoUploadError).not.toHaveBeenCalledWith(
    expect.stringMatching(/^#\d+ 실패/),
    expect.anything(),
  );
});

it('현재 분석이 없으면 서버 상태를 조회하지 않는다', async () => {
  const { analysisApi, photoUploadService } = setup();

  await photoUploadService.refreshNow();

  expect(analysisApi.get).not.toHaveBeenCalled();
});

it('현재 분석의 최신 상태를 서버에서 다시 받아 반영한다', async () => {
  const { analysisApi, photoUploadService, start } = setup();
  analysisApi.create.mockResolvedValue({ analysisId: 'analysis-1', uploads: [] });
  analysisApi.get.mockResolvedValue({
    id: 'analysis-1',
    status: 'COMPLETED',
    progress: 100,
    notificationRequested: false,
  });

  await start();

  analysisApi.get.mockResolvedValue({
    id: 'analysis-1',
    status: 'COMPLETED',
    progress: 100,
    notificationRequested: true,
  });
  await photoUploadService.refreshNow();

  expect(analysisApi.get).toHaveBeenLastCalledWith('analysis-1');
  expect(photoUploadService.getViewState()).toMatchObject({
    analysisId: 'analysis-1',
    status: 'COMPLETED',
    progress: 100,
    notificationRequested: true,
  });
});

it('저장된 분석이 완료됐으면 완료 상태를 복구한다', async () => {
  const { analysisApi, photoUploadService } = setup();
  mockLoadJob.mockResolvedValue({
    snapshot: {
      jobId: 'job-1',
      boardId: 'board-1',
      groups: [
        {
          items: [
            {
              clientPhotoId: 'photo-1',
              fileUri: 'file:///photo-1.jpg',
              contentType: 'image/jpeg',
              takenAt: '2026-09-21T00:00:00Z',
              isRepresentative: true,
            },
          ],
        },
      ],
    },
    events: [
      {
        type: 'ANALYSIS_CREATED',
        analysisId: 'analysis-1',
        photoIds: { 'photo-1': 'server-photo-1' },
      },
      { type: 'START_REQUESTED' },
    ],
  });
  analysisApi.get.mockResolvedValue({
    id: 'analysis-1',
    status: 'COMPLETED',
    progress: 100,
    notificationRequested: true,
  });

  await expect(photoUploadService.getRecoveryStatus()).resolves.toBe('COMPLETED');
  expect(photoUploadService.getCurrent()).not.toBeNull();
  expect(photoUploadService.getCurrentJobId()).toBe('job-1');
  expect(photoUploadService.getViewState()).toMatchObject({
    analysisId: 'analysis-1',
    notificationRequested: true,
    progress: 100,
    status: 'COMPLETED',
  });
});
