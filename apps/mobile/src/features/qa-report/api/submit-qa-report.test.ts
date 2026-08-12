import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { Video } from 'react-native-compressor';

import type { QaReport } from '../model/qa-report';

import { submitQaReport } from './submit-qa-report';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-file-system', () => ({
  File: jest.fn((uri: string) => Object.assign(new Blob(['video']), { uri })),
}));
jest.mock('react-native-compressor', () => ({ Video: { compress: jest.fn() } }));

const fetchMock = fetch as jest.MockedFunction<typeof fetch>;
const compressMock = Video.compress as jest.MockedFunction<typeof Video.compress>;

it('큰 영상을 압축해 인증 없이 QA API로 보낸다', async () => {
  process.env.EXPO_PUBLIC_WEB_URL = 'https://app.example';
  compressMock.mockResolvedValue('file:///compressed.mp4');
  fetchMock.mockResolvedValue({ ok: true, status: 200 } as Awaited<ReturnType<typeof fetch>>);

  const report: QaReport = {
    title: '스티커가 튐',
    category: '기능',
    currentBehavior: '위치가 바뀐다',
    expectedBehavior: '위치가 유지된다',
    reportedAt: '2026-08-12T12:00:00.000Z',
    buildNumber: '143',
    video: { uri: 'file:///original.mp4', size: 5_000_000 },
    diagnostics: [],
  };

  await submitQaReport(report);

  expect(compressMock).toHaveBeenCalledWith(
    report.video.uri,
    expect.objectContaining({ bitrate: 1_000_000, maxSize: 480, stripAudio: true }),
  );
  expect(File).toHaveBeenCalledWith('file:///compressed.mp4');
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/qa-report$/),
    expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData),
    }),
  );
});
