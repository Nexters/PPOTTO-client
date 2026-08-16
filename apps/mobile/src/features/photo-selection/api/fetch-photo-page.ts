import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

import type { GalleryPhoto } from '../model/gallery-photo';
import type { FetchPhotoPage } from '../model/photo-page';

const toGalleryPhoto = (asset: MediaLibrary.Asset): GalleryPhoto => ({
  id: asset.id,
  uri: asset.uri,
  creationTime: asset.creationTime,
  width: asset.width,
  height: asset.height,
});

const LOCAL_CHECK_BATCH_SIZE = 20;

async function filterLocalAssets(assets: MediaLibrary.Asset[]) {
  if (Platform.OS !== 'ios') return assets;

  const localAssets: MediaLibrary.Asset[] = [];
  for (let index = 0; index < assets.length; index += LOCAL_CHECK_BATCH_SIZE) {
    const checked = await Promise.all(
      assets.slice(index, index + LOCAL_CHECK_BATCH_SIZE).map(async (asset) => {
        try {
          const info = await MediaLibrary.getAssetInfoAsync(asset, {
            shouldDownloadFromNetwork: false,
          });
          return info.isNetworkAsset ? undefined : asset;
        } catch {
          return undefined;
        }
      }),
    );
    localAssets.push(...checked.filter((asset) => asset !== undefined));
  }

  return localAssets;
}

export const getPhotoLibraryPermission = () => MediaLibrary.getPermissionsAsync();

export const requestPhotoLibraryPermission = () => MediaLibrary.requestPermissionsAsync();

export const presentPhotoLibraryPermissionPicker = () =>
  MediaLibrary.presentPermissionsPickerAsync(['photo']);

/** 그룹화에는 메타데이터만 필요하므로 getAssetsAsync 사용 */
export const fetchPhotoPage: FetchPhotoPage = async ({ first, after }) => {
  const page = await MediaLibrary.getAssetsAsync({
    first,
    after,
    sortBy: MediaLibrary.SortBy.creationTime,
  });
  const assets = await filterLocalAssets(page.assets);

  return {
    assets: assets.map(toGalleryPhoto),
    endCursor: page.endCursor,
    hasNextPage: page.hasNextPage,
  };
};
