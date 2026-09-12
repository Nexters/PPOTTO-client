import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { getOrCreateDeviceId } from './device-id';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);
const randomUUID = jest.mocked(Crypto.randomUUID);

beforeEach(() => {
  jest.clearAllMocks();
});

it('저장된 기기 식별자를 재사용한다', async () => {
  getItemAsync.mockResolvedValue('saved-device-id');

  await expect(getOrCreateDeviceId()).resolves.toBe('saved-device-id');
  expect(randomUUID).not.toHaveBeenCalled();
  expect(setItemAsync).not.toHaveBeenCalled();
});

it('저장된 식별자가 없으면 생성해 저장한다', async () => {
  getItemAsync.mockResolvedValue(null);
  randomUUID.mockReturnValue('new-device-id');

  await expect(getOrCreateDeviceId()).resolves.toBe('new-device-id');
  expect(setItemAsync).toHaveBeenCalledWith('ppotto.notification-device-id', 'new-device-id');
});
