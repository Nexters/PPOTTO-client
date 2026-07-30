import { getAssetInfoAsync, type Asset } from 'expo-media-library';

import type { GalleryPhoto } from '@/shared/lib/photo';

export async function extractGalleryPhoto(asset: Asset): Promise<GalleryPhoto> {
  const info = await getAssetInfoAsync(asset);

  return {
    id: info.id,
    uri: info.localUri ?? info.uri,
    creationTime: info.creationTime,
    width: info.width,
    height: info.height,
  };
}
