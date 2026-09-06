import type { PhotoUploadServiceDependencies } from './model/start-photo-upload';

jest.mock('@/shared/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/entities/analysis/api/analysis-api', () => ({
  analysisApi: { get: jest.fn(), getActive: jest.fn(), start: jest.fn() },
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
}));

function setup() {
  jest.resetModules();
  jest.useFakeTimers();
  const { track } = jest.requireMock('@/shared/lib/analytics') as { track: jest.Mock };
  const { analysisApi } = jest.requireMock('@/entities/analysis/api/analysis-api') as {
    analysisApi: { get: jest.Mock; getActive: jest.Mock; start: jest.Mock };
  };
  const { startPhotoUpload } = jest.requireMock('./model/start-photo-upload') as {
    startPhotoUpload: jest.Mock;
  };
  startPhotoUpload.mockImplementation(
    async (_job, dependencies: PhotoUploadServiceDependencies) => {
      const photo = {
        contentType: 'image/jpeg' as const,
        fileUri: 'file:///test/a.jpg',
        uploadUrl: 'https://test.invalid/upload',
      };
      await Promise.all([dependencies.putPhoto(photo), dependencies.putPhoto(photo)]);
      await dependencies.startAnalysis('analysis-1');
      return { analysisId: 'analysis-1', status: 'ANALYZING' };
    },
  );
  const { photoUploadService } =
    jest.requireActual<typeof import('./photo-upload-service')>('./photo-upload-service');
  const start = () =>
    photoUploadService.start({
      jobId: 'job-1',
      uploadMode: 'additional',
      photoCount: 2,
      motionPhotos: Promise.resolve([]),
      prepareJob: async () => ({ jobId: 'job-1', boardId: 'board-1', groups: [] }),
    });
  return { track, analysisApi, photoUploadService, start };
}

afterEach(() => jest.useRealTimers());

it('여러 PUT과 반복 폴링에도 시작/완료는 각각 한 번 기록한다', async () => {
  const { track, analysisApi, start } = setup();
  analysisApi.get
    .mockResolvedValueOnce({ status: 'ANALYZING', progress: 10 })
    .mockResolvedValueOnce({ status: 'ANALYZING', progress: 40 })
    .mockResolvedValueOnce({ status: 'COMPLETED', progress: 100 });
  const promise = start();
  await jest.runAllTimersAsync();
  await promise;
  expect(track.mock.calls.map(([name]) => name)).toEqual([
    'photo_upload_started',
    'photo_upload_completed',
    'analysis_started',
    'analysis_completed',
  ]);
  expect(track).toHaveBeenCalledWith('photo_upload_started', {
    upload_mode: 'additional',
    photo_count: 2,
  });
  expect(track).toHaveBeenCalledWith('analysis_completed', { duration_ms: 4000 });
});

it('서버 FAILED는 업로드 실패와 구분하고 오류 원문을 전송하지 않는다', async () => {
  const { track, analysisApi, start } = setup();
  analysisApi.get.mockResolvedValue({
    status: 'FAILED',
    progress: 0,
    failureCode: 'ANALYSIS-007',
    failedReason: 'private error text',
  });
  await expect(start()).rejects.toThrow('private error text');
  expect(track).toHaveBeenLastCalledWith('analysis_failed', {
    failure_kind: 'analysis-failed',
    error_code: 'ANALYSIS-007',
  });
  expect(track.mock.calls.some(([name]) => name === 'photo_upload_failed')).toBe(false);
});

it('자동 재시도로 회복한 오류는 실패 이벤트로 세지 않는다', async () => {
  const { track, analysisApi, start } = setup();
  const { NetworkError } = jest.requireActual<typeof import('@ppotto/api')>('@ppotto/api');
  analysisApi.get
    .mockRejectedValueOnce(new NetworkError(new Error('temporary')))
    .mockResolvedValueOnce({ status: 'COMPLETED', progress: 100 });
  const promise = start();
  await jest.runAllTimersAsync();
  await promise;
  expect(track.mock.calls.some(([name]) => name.endsWith('_failed'))).toBe(false);
});

it('이미 완료된 분석 재개는 업로드 이벤트·추측한 소요 시간을 만들지 않는다', async () => {
  const { track, analysisApi, photoUploadService } = setup();
  analysisApi.getActive.mockResolvedValue({ id: 'analysis-1', status: 'COMPLETED' });
  analysisApi.get.mockResolvedValue({ status: 'COMPLETED', progress: 100 });
  await photoUploadService.resume();
  expect(track.mock.calls).toEqual([['analysis_completed', {}]]);
  photoUploadService.clearCurrent();
  await photoUploadService.resume();
  expect(track).toHaveBeenCalledTimes(1);
});

it.each([401, 503])(
  '최종 HTTP %s 오류는 분석 실패로 분류하며 재시도 중간에는 기록하지 않는다',
  async (status) => {
    const { track, analysisApi, start } = setup();
    const { HttpError } = jest.requireActual<typeof import('@ppotto/api')>('@ppotto/api');
    analysisApi.get.mockRejectedValue(new HttpError(status, 'TEST-001', {}));
    const result = expect(start()).rejects.toMatchObject({ status });
    await jest.runAllTimersAsync();
    await result;
    expect(analysisApi.get).toHaveBeenCalledTimes(status >= 500 ? 2 : 1);
    expect(track.mock.calls.filter(([name]) => name === 'analysis_failed')).toEqual([
      [
        'analysis_failed',
        {
          failure_kind: status >= 500 ? 'server-error' : 'client-error',
          http_status: status,
          error_code: 'TEST-001',
        },
      ],
    ]);
  },
);

it('파일 전송 후 시작 승인이 실패하면 업로드 성공을 기록하지 않는다', async () => {
  const { track, analysisApi, start } = setup();
  analysisApi.start.mockRejectedValue(new Error('start failed'));
  await expect(start()).rejects.toThrow('start failed');
  expect(track.mock.calls.map(([name]) => name)).toEqual([
    'photo_upload_started',
    'photo_upload_failed',
  ]);
});
