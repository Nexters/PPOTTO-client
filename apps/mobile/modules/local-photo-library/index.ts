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

interface LocalPhotoLibraryNativeModule {
  fetchLocalPhotoGroups(offset: number, limit: number, album: string): Promise<LocalPhotoGroupPage>;
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
