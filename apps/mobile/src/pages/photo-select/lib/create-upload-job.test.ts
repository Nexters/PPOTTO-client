/**
 * 선택 상태를 영속 업로드 작업으로 확정하는 경계
 * - 제외 상태·대표 사진·촬영 순서·준비된 파일 반영
 * - 선택된 사진의 준비 파일이 없으면 작업 생성 거절
 */
import type { GalleryPhoto, PhotoSelection } from '@/features/photo-selection';

import { createUploadJob } from './create-upload-job';

const BASE_TIME = Date.parse('2026-08-09T00:00:00.000Z');

function photo(id: string, minute: number): GalleryPhoto {
  return {
    id,
    uri: `ph://${id}`,
    creationTime: BASE_TIME + minute * 60_000,
    width: 100,
    height: 100,
  };
}

it('선택 상태와 준비된 파일로 촬영순 업로드 작업을 만든다', () => {
  const old = photo('old', 0);
  const excludedGroupPhoto = photo('excluded-group-photo', 5);
  const excludedRepresentative = photo('excluded-representative', 10);
  const representative = photo('representative', 11);
  const sibling = photo('sibling', 12);
  const selection: PhotoSelection = {
    groups: [
      {
        id: 'new-group',
        photos: [excludedRepresentative, representative, sibling],
      },
      { id: 'excluded-group', photos: [excludedGroupPhoto] },
      { id: 'old-group', photos: [old] },
    ],
    excludedCounts: { 'new-group': 1, 'excluded-group': 1 },
  };
  const preparedPhotos = new Map([
    ['old', { fileUri: 'file:///old.jpg', contentType: 'image/jpeg' as const }],
    [
      'representative',
      { fileUri: 'file:///representative.png', contentType: 'image/png' as const },
    ],
    ['sibling', { fileUri: 'file:///sibling.heic', contentType: 'image/heic' as const }],
  ]);

  expect(
    createUploadJob({ jobId: 'job-1', boardId: 'board-1', selection, preparedPhotos }),
  ).toEqual({
    jobId: 'job-1',
    boardId: 'board-1',
    groups: [
      {
        items: [
          {
            clientPhotoId: 'old',
            fileUri: 'file:///old.jpg',
            contentType: 'image/jpeg',
            width: 100,
            height: 100,
            takenAt: '2026-08-09T00:00:00.000Z',
            isRepresentative: true,
          },
        ],
      },
      {
        items: [
          {
            clientPhotoId: 'representative',
            fileUri: 'file:///representative.png',
            contentType: 'image/png',
            width: 100,
            height: 100,
            takenAt: '2026-08-09T00:11:00.000Z',
            isRepresentative: true,
          },
          {
            clientPhotoId: 'sibling',
            fileUri: 'file:///sibling.heic',
            contentType: 'image/heic',
            width: 100,
            height: 100,
            takenAt: '2026-08-09T00:12:00.000Z',
            isRepresentative: false,
          },
        ],
      },
    ],
  });
});

it('선택된 사진의 준비 파일이 없으면 작업 생성을 거절한다', () => {
  const selected = photo('selected', 0);
  const selection: PhotoSelection = {
    groups: [{ id: 'group', photos: [selected] }],
    excludedCounts: {},
  };

  expect(() =>
    createUploadJob({
      jobId: 'job-1',
      boardId: 'board-1',
      selection,
      preparedPhotos: new Map(),
    }),
  ).toThrow('업로드 준비 결과가 없습니다: selected');
});
