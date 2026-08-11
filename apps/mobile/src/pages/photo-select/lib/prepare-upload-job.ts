import * as MediaLibrary from 'expo-media-library';

import type { GalleryPhoto, PhotoSelection } from '@/features/photo-selection';

import { createUploadJob } from './create-upload-job';

interface PrepareUploadJobOptions {
  jobId: string;
  boardId: string;
  selection: PhotoSelection;
  compressedPhotos: ReadonlyMap<string, GalleryPhoto>;
}

/** 선택된 압축본과 원본 폴백을 실제 업로드 파일로 확정한다. */
export async function prepareUploadJob({
  jobId,
  boardId,
  selection,
  compressedPhotos,
}: PrepareUploadJobOptions) {
  const selectedPhotos = selection.groups.flatMap((group) =>
    group.photos.slice(selection.excludedCounts[group.id] ?? 0),
  );
  const preparedPhotos = new Map(
    await Promise.all(
      selectedPhotos.map(async (source) => {
        const compressed = compressedPhotos.get(source.id);
        if (!compressed) throw new Error(`압축 결과가 없습니다: ${source.id}`);

        if (compressed.uri !== source.uri) {
          return [
            source.id,
            { fileUri: compressed.uri, contentType: 'image/jpeg' as const },
          ] as const;
        }

        const original = await MediaLibrary.getAssetInfoAsync(source.id);
        if (!original.localUri) throw new Error(`원본 파일을 불러올 수 없습니다: ${source.id}`);

        return [
          source.id,
          { fileUri: original.localUri, contentType: contentTypeOf(original.filename) },
        ] as const;
      }),
    ),
  );

  return createUploadJob({ jobId, boardId, selection, preparedPhotos });
}

function contentTypeOf(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg' as const;
  if (extension === 'png') return 'image/png' as const;
  if (extension === 'heic' || extension === 'heif') return 'image/heic' as const;
  throw new Error(`지원하지 않는 원본 이미지 형식입니다: ${filename}`);
}
