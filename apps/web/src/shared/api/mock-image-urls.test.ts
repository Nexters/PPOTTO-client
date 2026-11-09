import { expect, it } from 'vitest';

import { replaceGcsUrls } from './mock-image-urls';

it('응답 안의 GCS 서명 URL만 목 이미지 경로로 바꾼다', () => {
  const body = JSON.stringify({
    sticker:
      'https://storage.googleapis.com/ppotto-bucket-dev/stickers/a/1-b.png?X-Goog-Signature=a&X-Goog-Expires=3600',
    previews: [
      'https://storage.googleapis.com/ppotto-bucket-dev/photos/x/y.jpg?X-Goog-Signature=c',
    ],
    name: '제주 여행',
  });

  expect(JSON.parse(replaceGcsUrls(body))).toEqual({
    sticker: '/board/stickers/cat.png',
    previews: ['/board/stickers/cat.png'],
    name: '제주 여행',
  });
});
