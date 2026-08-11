/**
 * Presigned URL 업로드 경계
 * - 파일과 Content-Type을 PUT 요청으로 전송
 * - 403과 그 외 HTTP 실패 구분
 * - 요청 자체의 예외를 네트워크 실패로 구분
 */
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { putPhoto } from './put-photo';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: jest.fn((uri: string) => ({ uri })) }));

const fetchMock = fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
});

it('파일과 Content-Type을 presigned URL에 PUT한다', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
  } as Awaited<ReturnType<typeof fetch>>);

  await expect(
    putPhoto({
      fileUri: 'file:///photo.jpg',
      uploadUrl: 'https://storage.example/photo',
      contentType: 'image/jpeg',
    }),
  ).resolves.toEqual({ ok: true });
  expect(fetchMock).toHaveBeenCalledWith('https://storage.example/photo', {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/jpeg',
      'x-goog-content-length-range': '0,15728640',
    },
    body: { uri: 'file:///photo.jpg' },
  });
  expect(File).toHaveBeenCalledWith('file:///photo.jpg');
});

it.each([
  { status: 403, reason: 'FORBIDDEN' },
  { status: 500, reason: 'SERVER' },
] as const)('HTTP $status를 $reason 실패로 구분한다', async ({ reason, status }) => {
  fetchMock.mockResolvedValue({
    ok: false,
    status,
  } as Awaited<ReturnType<typeof fetch>>);

  await expect(
    putPhoto({
      fileUri: 'file:///photo.jpg',
      uploadUrl: 'https://storage.example/photo',
      contentType: 'image/jpeg',
    }),
  ).resolves.toEqual({ ok: false, reason });
});

it('요청 자체가 실패하면 네트워크 실패로 구분한다', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));

  await expect(
    putPhoto({
      fileUri: 'file:///photo.jpg',
      uploadUrl: 'https://storage.example/photo',
      contentType: 'image/jpeg',
    }),
  ).resolves.toEqual({ ok: false, reason: 'NETWORK' });
});
