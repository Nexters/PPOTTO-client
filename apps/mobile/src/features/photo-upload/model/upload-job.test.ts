import { restoreUploadJob, type UploadJobEvent, type UploadJobSnapshot } from './upload-job';

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
  ],
};

/**
 * 업로드 작업 상태
 * - PREPARING: 분석 생성 전
 * - PUTTING: presigned URL에 사진 업로드 중
 * - STARTING: 사진 업로드 완료 후 분석 시작 요청 중
 * - CANCELING: 업로드 실패 후 분석 취소 요청 중
 *
 * 저장된 이벤트로 다음 상태와 데이터를 복구한다.
 * - 이벤트 없음 → PREPARING
 * - ANALYSIS_CREATED 존재 → PUTTING
 * - START_REQUESTED 존재 → STARTING
 * - CANCEL_REQUESTED 존재 → CANCELING
 * - 저장된 analysisId 복구
 * - 로컬 사진 ID ↔ 서버 사진 ID 매핑 복구
 * - 업로드 완료된 사진 ID 복구
 */
const analysisCreated: UploadJobEvent = {
  type: 'ANALYSIS_CREATED',
  analysisId: 'analysis-1',
  photoIds: { 'local-a': 'server-a', 'local-b': 'server-b' },
};

it('저장된 이벤트에서 현재 phase와 업로드 성공 사진을 복구한다', () => {
  expect(restoreUploadJob(snapshot, []).phase).toBe('PREPARING');
  expect(restoreUploadJob(snapshot, [analysisCreated]).phase).toBe('PUTTING');
  expect(restoreUploadJob(snapshot, [analysisCreated, { type: 'START_REQUESTED' }]).phase).toBe(
    'STARTING',
  );
  expect(restoreUploadJob(snapshot, [analysisCreated, { type: 'CANCEL_REQUESTED' }]).phase).toBe(
    'CANCELING',
  );

  const putting = restoreUploadJob(snapshot, [
    analysisCreated,
    { type: 'PHOTO_UPLOADED', photoId: 'server-a' },
  ]);
  expect(putting.analysisId).toBe('analysis-1');
  expect(putting.photoIds).toEqual({ 'local-a': 'server-a', 'local-b': 'server-b' });
  expect([...putting.uploadedPhotoIds]).toEqual(['server-a']);
});
