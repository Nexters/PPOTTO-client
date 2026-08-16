import * as MediaLibrary from 'expo-media-library';

import type { GalleryPhoto } from '../model/gallery-photo';
import type { FetchPhotoPage } from '../model/photo-page';

const toGalleryPhoto = (asset: MediaLibrary.Asset): GalleryPhoto => ({
  id: asset.id,
  uri: asset.uri,
  creationTime: asset.creationTime,
  width: asset.width,
  height: asset.height,
});

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

  return {
    assets: page.assets.map(toGalleryPhoto),
    endCursor: page.endCursor,
    hasNextPage: page.hasNextPage,
  };
};
