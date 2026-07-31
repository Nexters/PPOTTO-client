import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { GalleryPhoto } from '../model/gallery-photo';

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.8;

export type CompressPhotoOptions = {
  maxDimension?: number;
  quality?: number;
};

export type CompressionSizes = {
  originalBytes: number;
  outputBytes: number;
};

const compressionSizes = new WeakMap<GalleryPhoto, CompressionSizes>();

export const getCompressionSizes = (photo: GalleryPhoto) => compressionSizes.get(photo);

function getFileSize(uri: string) {
  try {
    return new File(uri).size;
  } catch {
    return 0;
  }
}

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
  const sourceUri = photo.uri;
  const originalBytes = getFileSize(sourceUri);
  if (originalBytes > 0) {
    compressionSizes.set(photo, { originalBytes, outputBytes: originalBytes });
  }

  const target = computeResizeTarget(photo, maxDimension);
  const context = target
    ? ImageManipulator.manipulate(sourceUri).resize(target)
    : ImageManipulator.manipulate(sourceUri);

  try {
    const image = await context.renderAsync();

    try {
      const result = await image.saveAsync({ compress: quality, format: SaveFormat.JPEG });
      const compressed = {
        ...photo,
        uri: result.uri,
        width: result.width,
        height: result.height,
      };
      const outputBytes = getFileSize(result.uri);
      if (originalBytes > 0 && outputBytes > 0) {
        compressionSizes.set(compressed, { originalBytes, outputBytes });
      }
      return compressed;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
