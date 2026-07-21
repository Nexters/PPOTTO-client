import type { Asset } from 'expo-media-library';

import type { GalleryPhoto } from '@/types/photo';

export async function extractGalleryPhoto(asset: Asset): Promise<GalleryPhoto> {
  const info = await asset.getInfo();

  return {
    id: info.id,
    uri: info.uri,
    creationTime: info.creationTime ?? undefined,
    width: info.width,
    height: info.height,
  };
}
