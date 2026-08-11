/**
 * 최초 분석 생성 시나리오
 * - 압축 완료된 그룹 → photos[].items 형태로 분석 생성 요청
 * - 요청 사진 순서와 응답 uploads 순서로 로컬 사진 ID와 서버 사진 ID 연결
 * - analysisId와 사진 ID 매핑을 ANALYSIS_CREATED 이벤트로 저장
 * - 이후 PUT에 사용할 presigned URL 반환
 */
import type { UploadJobSnapshot } from './upload-job';
import {
  createUploadAnalysis,
  type CreateUploadAnalysisDependencies,
} from './create-upload-analysis';

it('압축 완료된 그룹으로 분석을 생성하고 사진 ID 매핑을 저장한다', async () => {
  const snapshot: UploadJobSnapshot = {
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
      {
        items: [
          {
            clientPhotoId: 'local-c',
            fileUri: 'file:///c.jpg',
            contentType: 'image/jpeg',
            takenAt: '2026-08-09T00:02:00.000Z',
            isRepresentative: true,
          },
        ],
      },
    ],
  };
  const dependencies: jest.Mocked<CreateUploadAnalysisDependencies> = {
    appendEvent: jest.fn<
      ReturnType<CreateUploadAnalysisDependencies['appendEvent']>,
      Parameters<CreateUploadAnalysisDependencies['appendEvent']>
    >(async () => undefined),
    createAnalysis: jest.fn<
      ReturnType<CreateUploadAnalysisDependencies['createAnalysis']>,
      Parameters<CreateUploadAnalysisDependencies['createAnalysis']>
    >(async () => ({
      analysisId: 'analysis-1',
      uploads: [
        { photoId: 'server-a', uploadUrl: 'https://upload/a' },
        { photoId: 'server-b', uploadUrl: 'https://upload/b' },
        { photoId: 'server-c', uploadUrl: 'https://upload/c' },
      ],
    })),
  };

  const result = await createUploadAnalysis(snapshot, dependencies);

  expect(dependencies.createAnalysis).toHaveBeenCalledWith({
    boardId: 'board-1',
    photos: [
      {
        items: [
          {
            contentType: 'image/jpeg',
            takenAt: '2026-08-09T00:00:00.000Z',
            isRepresentative: true,
          },
          {
            contentType: 'image/jpeg',
            takenAt: '2026-08-09T00:01:00.000Z',
            isRepresentative: false,
          },
        ],
      },
      {
        items: [
          {
            contentType: 'image/jpeg',
            takenAt: '2026-08-09T00:02:00.000Z',
            isRepresentative: true,
          },
        ],
      },
    ],
  });
  expect(dependencies.appendEvent).toHaveBeenCalledWith({
    type: 'ANALYSIS_CREATED',
    analysisId: 'analysis-1',
    photoIds: {
      'local-a': 'server-a',
      'local-b': 'server-b',
      'local-c': 'server-c',
    },
  });
  expect(result.uploads).toEqual([
    { photoId: 'server-a', uploadUrl: 'https://upload/a' },
    { photoId: 'server-b', uploadUrl: 'https://upload/b' },
    { photoId: 'server-c', uploadUrl: 'https://upload/c' },
  ]);
});
