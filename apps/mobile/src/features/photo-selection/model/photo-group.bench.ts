import { bench, describe, expect } from 'vitest';

import type { GalleryPhoto } from './gallery-photo';
import { groupPhotos } from './photo-group';

const BASE_TIME = Date.parse('2026-10-14T12:00:00.000Z');
const SIZES = [100, 1_000, 10_000];

// 실제 갤러리처럼 최신순으로 누적된 입력. 이미지 파일은 읽지 않는다.
function createPhotos(count: number, photosPerGroup: number): GalleryPhoto[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `photo-${String(index).padStart(5, '0')}`,
    uri: `file:///benchmark/photo-${index}.jpg`,
    creationTime:
      BASE_TIME -
      Math.floor(index / photosPerGroup) * 10 * 60_000 -
      // 연사에는 동일 촬영 시각도 포함해 ID로 순서를 정하는 경로를 실행한다.
      Math.floor((index % photosPerGroup) / 2) * 1_000,
    width: 1280,
    height: 960,
  }));
}

for (const { name, photosPerGroup } of [
  { name: '띄엄띄엄 촬영: 10분마다 1장', photosPerGroup: 1 },
  { name: '연사: 10분마다 10장', photosPerGroup: 10 },
]) {
  describe(name, () => {
    for (const count of SIZES) {
      // 데이터 생성과 정답 준비는 측정 전에 끝낸다. 한 번의 전체 재그룹화만 잰다.
      const photos = createPhotos(count, photosPerGroup);
      const expectedGroupSizes = Array(count / photosPerGroup).fill(photosPerGroup);
      let result: ReturnType<typeof groupPhotos> = [];

      bench(
        `누적 ${count.toLocaleString('en-US')}장 재그룹화`,
        () => {
          result = groupPhotos(photos);
        },
        {
          warmupTime: 200,
          time: 1_000,
          iterations: 1_000,
          // 결과를 실제로 사용하고 입력 분포를 검증하되, 검증 시간은 측정에서 뺀다.
          teardown: () => {
            expect(result.map((group) => group.photos.length)).toEqual(expectedGroupSizes);
          },
        },
      );
    }
  });
}
