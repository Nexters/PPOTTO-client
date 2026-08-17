import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

import { fetchLocalPhotoGroupPage } from '../../../../modules/local-photo-library';
import type { GalleryPhoto } from '../model/gallery-photo';
import type { FetchPhotoPage } from '../model/photo-page';

const toGalleryPhoto = (asset: MediaLibrary.Asset): GalleryPhoto => ({
  id: asset.id,
  uri: asset.uri,
  creationTime: asset.creationTime,
  width: asset.width,
  height: asset.height,
});

export const getPhotoLibraryPermission = () => MediaLibrary.getPermissionsAsync(false, ['photo']);

export const requestPhotoLibraryPermission = () =>
  MediaLibrary.requestPermissionsAsync(false, ['photo']);

export const presentPhotoLibraryPermissionPicker = () =>
  MediaLibrary.presentPermissionsPickerAsync(['photo']);

/** iOS는 Swift에서 로컬 사진 검사와 그룹 페이지 경계를 확정한다. */
export const fetchPhotoPage: FetchPhotoPage = async ({ album, first, after }) => {
  if (Platform.OS === 'ios') {
    return fetchLocalPhotoGroupPage({ after, album, first });
  }

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
