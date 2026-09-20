import type { PhotoUploadServiceDependencies } from './model/start-photo-upload';

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
  createUploadJobStorage: () => ({ loadJob: jest.fn(async () => null), clearJob: jest.fn() }),
}));
jest.mock('./model/start-photo-upload', () => ({
  startPhotoUpload: jest.fn(),
  resumeSavedPhotoUpload: jest.fn(async () => null),
  discardSavedPhotoUpload: jest.fn(),
}));

function setup() {
  jest.resetModules();
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
  ['DISCARDED', null, false],
  ['ANALYZING', 'analysis-1', true],
] as const)(
  '폐기 결과가 %s이면 분석 정보를 그에 맞게 처리한다',
  async (result, analysisId, notificationRequested) => {
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

    expect(photoUploadService.getViewState()).toMatchObject({ analysisId, notificationRequested });
  },
);
