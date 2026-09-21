import { getMessaging, getToken } from '@react-native-firebase/messaging';

export function getFcmToken(): Promise<string> {
  return getToken(getMessaging());
}
