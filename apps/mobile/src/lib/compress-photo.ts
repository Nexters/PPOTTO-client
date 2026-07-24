import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { GalleryPhoto } from '@/types/photo';

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.8;

export type CompressPhotoOptions = {
  maxDimension?: number;
  quality?: number;
};

function computeResizeTarget(
  photo: GalleryPhoto,
  maxDimension: number,
): { width: number; height: number } | null {
  const longestSide = Math.max(photo.width, photo.height);
  if (longestSide <= maxDimension) return null;

  const scale = maxDimension / longestSide;
  return { width: Math.round(photo.width * scale), height: Math.round(photo.height * scale) };
}

/**
 * `photo.uri`는 이미 로컬 파일 경로(`file://`)여야 한다. iOS의 `ph://` asset URI를
 * 그대로 넘기면 리사이즈/저장이 실패하거나 예상과 다르게 동작할 수 있다.
 */
export async function compressPhoto(
  photo: GalleryPhoto,
  options?: CompressPhotoOptions,
): Promise<GalleryPhoto> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  const target = computeResizeTarget(photo, maxDimension);
  const context = target
    ? ImageManipulator.manipulate(photo.uri).resize(target)
    : ImageManipulator.manipulate(photo.uri);

  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });

  return { ...photo, uri: result.uri, width: result.width, height: result.height };
}
