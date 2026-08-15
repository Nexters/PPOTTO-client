import { Directory, File, Paths } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { GalleryPhoto } from '../model/gallery-photo';

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.8;
const STAGING_DIRECTORY = new Directory(Paths.document, 'photo-compression');

export type CompressPhotoOptions = {
  format?: SaveFormat;
  maxDimension?: number;
  quality?: number;
};

type CompressPhotoStage = 'render' | 'encode' | 'copy';

function computeResizeTarget(
  photo: GalleryPhoto,
  maxDimension: number,
): { width: number; height: number } | null {
  const longestSide = Math.max(photo.width, photo.height);
  if (longestSide <= maxDimension) return null;

  const scale = maxDimension / longestSide;
  return { width: Math.round(photo.width * scale), height: Math.round(photo.height * scale) };
}

export async function compressPhoto(
  photo: GalleryPhoto,
  options?: CompressPhotoOptions,
  onStage?: (stage: CompressPhotoStage) => void,
): Promise<GalleryPhoto> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const format = options?.format ?? SaveFormat.JPEG;
  const sourceUri = photo.uri;

  const target = computeResizeTarget(photo, maxDimension);
  const context = target
    ? ImageManipulator.manipulate(sourceUri).resize(target)
    : ImageManipulator.manipulate(sourceUri);

  try {
    onStage?.('render');
    const image = await context.renderAsync();

    try {
      onStage?.('encode');
      const result = await image.saveAsync({ compress: quality, format });
      onStage?.('copy');
      STAGING_DIRECTORY.create({ idempotent: true, intermediates: true });
      const source = new File(result.uri);
      const staged = new File(STAGING_DIRECTORY, source.name);
      await copyAsync({ from: source.uri, to: staged.uri });
      const compressed = {
        ...photo,
        uri: staged.uri,
        width: result.width,
        height: result.height,
      };
      return compressed;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

/** 새 갤러리 목록을 압축하기 전에 이전 staging 파일을 정리한다. */
export function clearCompressedPhotos() {
  if (STAGING_DIRECTORY.exists) STAGING_DIRECTORY.delete();
}
