import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

import { track } from '@/shared/lib/analytics';

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

export const requestPhotoLibraryPermission = async () => {
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  track('photo_permission_result', {
    access:
      permission.accessPrivileges === 'limited' ? 'limited' : permission.granted ? 'all' : 'denied',
  });
  return permission;
};

export const presentPhotoLibraryPermissionPicker = () =>
  MediaLibrary.presentPermissionsPickerAsync(['photo']);

/** iOS는 Swift에서 그룹 페이지 경계를 확정한다. iCloud 전용(원본 미보유) 사진도 포함된다. */
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
