import { Directory, File, Paths } from 'expo-file-system';
import { copyAsync } from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { loadResizedImage } from '../../../../modules/local-photo-library';
import type { GalleryPhoto } from '../model/gallery-photo';
import { icloudDownloadStatus } from '../model/icloud-download-status';

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.8;
const STAGING_DIRECTORY = new Directory(Paths.document, 'photo-compression');

let icloudDownloadCount = 0;

const log = (message: string) => {
  if (__DEV__ && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.log(message);
  }
};

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
  icloudDownloadStatus.begin();
  try {
    return await compressPhotoInner(photo, options, onStage);
  } finally {
    icloudDownloadStatus.end();
  }
}

async function compressPhotoInner(
  photo: GalleryPhoto,
  options?: CompressPhotoOptions,
  onStage?: (stage: CompressPhotoStage) => void,
): Promise<GalleryPhoto> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const format = options?.format ?? SaveFormat.JPEG;
  const sourceUri = photo.uri;

  // iOS는 PhotoKit이 다운로드(원본이 iCloud에만 있을 때)·리사이즈·JPEG 인코딩을 한 번에 처리한다.
  // format 옵션은 무시되고 항상 JPEG이다 — 현재 모든 호출부가 JPEG만 쓴다.
  if (Platform.OS === 'ios' && sourceUri.startsWith('ph://')) {
    onStage?.('render');
    const startedAt = Date.now();
    const loaded = await loadResizedImage(photo.id, maxDimension, quality);
    if (loaded.fromICloud) {
      icloudDownloadStatus.reportCloudDownload();
      icloudDownloadCount += 1;
      log(
        `[icloud-download] ${icloudDownloadCount}번째 완료 (${photo.id}, ${((Date.now() - startedAt) / 1000).toFixed(2)}초)`,
      );
    }

    onStage?.('copy');
    STAGING_DIRECTORY.create({ idempotent: true, intermediates: true });
    const source = new File(loaded.uri);
    const staged = new File(STAGING_DIRECTORY, source.name);
    await copyAsync({ from: source.uri, to: staged.uri });
    return { ...photo, uri: staged.uri, width: loaded.width, height: loaded.height };
  }

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

/** 업로드 준비용 임시 압축 파일을 정리한다. */
export function clearCompressedPhotos() {
  if (STAGING_DIRECTORY.exists) STAGING_DIRECTORY.delete();
}
