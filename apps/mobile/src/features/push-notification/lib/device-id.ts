import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'ppotto.notification-device-id';

export async function getOrCreateDeviceId(): Promise<string> {
  const savedDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (savedDeviceId) return savedDeviceId;

  const deviceId = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
