import type { GalleryPhoto, PhotoSelection } from '@/features/photo-selection';
import { selectedPhotoGroups } from '@/features/photo-selection/model/photo-group';
import type { UploadJobPhoto, UploadJobSnapshot } from '@/features/photo-upload';

export interface PreparedPhoto {
  fileUri: string;
  contentType: UploadJobPhoto['contentType'];
}

interface CreateUploadJobOptions {
  jobId: string;
  boardId: string;
  selection: PhotoSelection;
  preparedPhotos: ReadonlyMap<string, PreparedPhoto>;
}

/** 선택 상태와 준비된 파일을 앱 재실행 후에도 복구할 수 있는 업로드 작업으로 확정한다. */
export function createUploadJob({
  jobId,
  boardId,
  selection,
  preparedPhotos,
}: CreateUploadJobOptions): UploadJobSnapshot {
  const selectedGroups = selectedPhotoGroups(selection).reverse();

  return {
    jobId,
    boardId,
    groups: selectedGroups.map((group) => ({
      items: group.photos.map((photo, index) => toUploadJobPhoto(photo, index, preparedPhotos)),
    })),
  };
}

function toUploadJobPhoto(
  photo: GalleryPhoto,
  index: number,
  preparedPhotos: ReadonlyMap<string, PreparedPhoto>,
): UploadJobPhoto {
  const prepared = preparedPhotos.get(photo.id);
  if (!prepared) throw new Error(`업로드 준비 결과가 없습니다: ${photo.id}`);

  return {
    clientPhotoId: photo.id,
    fileUri: prepared.fileUri,
    contentType: prepared.contentType,
    width: photo.width,
    height: photo.height,
    takenAt: new Date(photo.creationTime).toISOString(),
    isRepresentative: index === 0,
  };
}
