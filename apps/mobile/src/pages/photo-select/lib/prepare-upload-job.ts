import * as MediaLibrary from 'expo-media-library';

import type { GalleryPhoto, PhotoSelection } from '@/features/photo-selection';
import { selectedPhotoGroups } from '@/features/photo-selection/model/photo-group';
import { PhotoPreparationError } from '@/features/photo-upload';

import { createUploadJob, type PreparedPhoto } from './create-upload-job';

interface PrepareUploadJobOptions {
  jobId: string;
  boardId: string;
  selection: PhotoSelection;
  compressedPhotos: ReadonlyMap<string, GalleryPhoto>;
  minSubmitUnits: number;
}

/**
 * 선택된 압축본과 원본 폴백을 실제 업로드 파일로 확정한다.
 *
 * 압축(iCloud 다운로드 포함)에 실패했고 원본도 기기에 없는 사진은 제외하되,
 * 남은 그룹이 minSubmitUnits 미만이면 잡 전체를 실패시켜 다시 업로드하게 한다.
 */
export async function prepareUploadJob({
  jobId,
  boardId,
  selection,
  compressedPhotos,
  minSubmitUnits,
}: PrepareUploadJobOptions) {
  const selectedGroups = selectedPhotoGroups(selection);
  const selectedPhotos = selectedGroups.flatMap((group) => group.photos);
  const entries = await Promise.all(
    selectedPhotos.map(async (source) => {
      const compressed = compressedPhotos.get(source.id);
      if (!compressed) throw new Error(`압축 결과가 없습니다: ${source.id}`);

      if (compressed.uri !== source.uri) {
        return [
          source.id,
          { fileUri: compressed.uri, contentType: 'image/jpeg' as const },
        ] as const;
      }

      // 폴백에서 원본을 iCloud에서 통째로 내려받지 않도록 네트워크를 막는다
      const original = await MediaLibrary.getAssetInfoAsync(source.id, {
        shouldDownloadFromNetwork: false,
      });
      if (!original.localUri) return [source.id, null] as const;

      return [
        source.id,
        { fileUri: original.localUri, contentType: contentTypeOf(original.filename) },
      ] as const;
    }),
  );

  const preparedPhotos = new Map<string, PreparedPhoto>();
  entries.forEach(([id, prepared]) => {
    if (prepared) preparedPhotos.set(id, prepared);
  });

  const groups = selectedGroups
    .map((group) => ({ ...group, photos: group.photos.filter((p) => preparedPhotos.has(p.id)) }))
    .filter((group) => group.photos.length > 0);

  if (groups.length < minSubmitUnits) {
    throw new PhotoPreparationError(
      `사진을 준비하지 못했습니다 (${groups.length}/${minSubmitUnits}그룹)`,
    );
  }

  return createUploadJob({
    jobId,
    boardId,
    selection: { groups, excludedCounts: {} },
    preparedPhotos,
  });
}

function contentTypeOf(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg' as const;
  if (extension === 'png') return 'image/png' as const;
  if (extension === 'heic' || extension === 'heif') return 'image/heic' as const;
  if (extension === 'webp') return 'image/webp' as const;
  throw new Error(`지원하지 않는 원본 이미지 형식입니다: ${filename}`);
}
