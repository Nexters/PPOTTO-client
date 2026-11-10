import * as SecureStore from 'expo-secure-store';

import {
  clearPendingBoardInvitation,
  getPendingBoardInvitation,
  savePendingBoardInvitation,
} from './pending-board-invitation';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const secureStore = jest.mocked(SecureStore);
const NOW = new Date('2026-11-10T00:00:00.000Z').getTime();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('초대 코드와 수신 시각을 저장한다', async () => {
  await savePendingBoardInvitation('K7P2QX');

  expect(secureStore.setItemAsync).toHaveBeenCalledWith(
    'ppotto.pending-board-invitation',
    JSON.stringify({ code: 'K7P2QX', receivedAt: NOW }),
  );
});

it('저장된 초대 목적지를 복원한다', async () => {
  secureStore.getItemAsync.mockResolvedValue(
    JSON.stringify({ code: 'K7P2QX', receivedAt: NOW - 60_000 }),
  );

  await expect(getPendingBoardInvitation()).resolves.toEqual({
    code: 'K7P2QX',
    receivedAt: NOW - 60_000,
  });
  expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
});

it('24시간이 지난 초대 목적지를 제거한다', async () => {
  secureStore.getItemAsync.mockResolvedValue(
    JSON.stringify({ code: 'K7P2QX', receivedAt: NOW - 24 * 60 * 60 * 1000 }),
  );

  await expect(getPendingBoardInvitation()).resolves.toBeNull();
  expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('ppotto.pending-board-invitation');
});

it.each([
  ['파싱할 수 없는 값', '{'],
  ['잘못된 코드', JSON.stringify({ code: 'invalid', receivedAt: NOW })],
  ['잘못된 수신 시각', JSON.stringify({ code: 'K7P2QX', receivedAt: 'now' })],
])('%s은 제거한다', async (_name, stored) => {
  secureStore.getItemAsync.mockResolvedValue(stored);

  await expect(getPendingBoardInvitation()).resolves.toBeNull();
  expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('ppotto.pending-board-invitation');
});

it('초대 목적지를 명시적으로 제거한다', async () => {
  await clearPendingBoardInvitation();

  expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('ppotto.pending-board-invitation');
});

it('형식이 잘못된 초대 코드는 저장하지 않는다', async () => {
  await expect(savePendingBoardInvitation('invalid')).rejects.toThrow(
    '유효하지 않은 보드 초대 코드입니다.',
  );
  expect(secureStore.setItemAsync).not.toHaveBeenCalled();
});
