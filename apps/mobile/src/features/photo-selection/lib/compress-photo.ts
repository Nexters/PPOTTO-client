import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { getAssetInfoAsync } from 'expo-media-library';

import type { GalleryPhoto } from '../model/gallery-photo';

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

export async function compressPhoto(
  photo: GalleryPhoto,
  options?: CompressPhotoOptions,
): Promise<GalleryPhoto> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const info = await getAssetInfoAsync(photo.id);
  const target = computeResizeTarget(photo, maxDimension);
  const context = target
    ? ImageManipulator.manipulate(info.localUri ?? photo.uri).resize(target)
    : ImageManipulator.manipulate(info.localUri ?? photo.uri);

  try {
    const image = await context.renderAsync();

    try {
      const result = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });
      return { ...photo, uri: result.uri, width: result.width, height: result.height };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
