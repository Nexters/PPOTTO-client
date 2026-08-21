import type { UploadMotionPhoto } from '../photo-upload-service';

import { sampleMotionPhotos } from './sample-motion-photos';

const photos = (count: number): UploadMotionPhoto[] =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index),
    uri: `file:///${index}.jpg`,
    width: 100,
    height: 100,
  }));

it('20장은 모두 쓰고 100장은 중복 없이 40장만 고정한다', () => {
  expect(sampleMotionPhotos(photos(20), () => 0)).toHaveLength(20);

  const sampled = sampleMotionPhotos(photos(100), () => 0.5);
  expect(sampled).toHaveLength(40);
  expect(new Set(sampled.map((photo) => photo.id)).size).toBe(40);
});
