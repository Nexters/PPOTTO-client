import { requireNativeModule } from 'expo-modules-core';

export interface LocalPhoto {
  id: string;
  uri: string;
  creationTime: number;
  width: number;
  height: number;
}

interface LocalPhotoGroupPage {
  assets: LocalPhoto[];
  endCursor: number;
  hasNextPage: boolean;
}

export interface ResizedPhotoFile {
  uri: string;
  width: number;
  height: number;
  fromICloud: boolean;
}

interface LocalPhotoLibraryNativeModule {
  fetchLocalPhotoGroups(offset: number, limit: number, album: string): Promise<LocalPhotoGroupPage>;
  loadResizedImage(
    assetId: string,
    maxDimension: number,
    quality: number,
  ): Promise<ResizedPhotoFile>;
}

let nativeModule: LocalPhotoLibraryNativeModule | undefined;

export async function fetchLocalPhotoGroupPage({
  after,
  album,
  first,
}: {
  after?: string;
  album: string;
  first: number;
}) {
  nativeModule ??= requireNativeModule<LocalPhotoLibraryNativeModule>('LocalPhotoLibrary');
  const page = await nativeModule.fetchLocalPhotoGroups(Number(after ?? 0), first, album);

  return { ...page, endCursor: String(page.endCursor) };
}

/** 원본이 iCloud에만 있어도 maxDimension 렌디션만 내려받아 JPEG 임시 파일로 돌려준다. */
export async function loadResizedImage(assetId: string, maxDimension: number, quality: number) {
  nativeModule ??= requireNativeModule<LocalPhotoLibraryNativeModule>('LocalPhotoLibrary');
  return nativeModule.loadResizedImage(assetId, maxDimension, quality);
}
