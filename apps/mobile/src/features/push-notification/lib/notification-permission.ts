import { Linking, PermissionsAndroid, Platform } from 'react-native';

export type NotificationPermission = 'granted' | 'denied' | 'blocked' | 'unsupported';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS !== 'android') return 'unsupported';
  if (Number(Platform.Version) < 33) return 'granted';

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await PermissionsAndroid.check(permission)) return 'granted';

  const result = await PermissionsAndroid.request(permission);
  if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
  return 'denied';
}

export function openNotificationSettings(): Promise<void> {
  return Linking.openSettings();
}
