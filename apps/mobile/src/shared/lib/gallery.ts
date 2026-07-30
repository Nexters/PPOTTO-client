import { getAssetInfoAsync, type Asset } from 'expo-media-library';

import type { GalleryPhoto } from '@/features/photo-selection/model/gallery-photo';

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
