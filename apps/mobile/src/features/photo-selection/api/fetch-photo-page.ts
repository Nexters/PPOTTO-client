import * as MediaLibrary from 'expo-media-library';

import { track } from '@/shared/lib/analytics';

import { fetchLocalPhotoGroupPage } from '../../../../modules/local-photo-library';
import type { FetchPhotoPage } from '../model/photo-page';

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

/** 네이티브(iOS PhotoKit / Android MediaStore)가 앨범 필터와 페이지 경계를 확정한다. iOS는 iCloud 전용 사진도 포함된다. */
export const fetchPhotoPage: FetchPhotoPage = ({ album, first, after }) =>
  fetchLocalPhotoGroupPage({ after, album, first });
