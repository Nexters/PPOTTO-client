// @vitest-environment node

import { bench, describe, expect } from 'vitest';

import {
  computePoissonInitialLayout,
  type ExistingSticker,
  STICKER_GROUP_GAP,
} from './poisson-cluster';

const SEEDS = [1, 42, 200];
const NEW_STICKERS = Array.from({ length: 6 }, (_, index) => ({
  id: `new-${index}`,
  type: 'IMAGE',
  scale: 1,
}));
const CASES = [
  { name: '빈 보드', count: 0, spacing: 0 },
  ...[50, 200, 1_000].flatMap((count) => [
    { name: '넓은 간격: 중심 간 480px', count, spacing: 480 },
    { name: '좁은 간격: 중심 간 240px', count, spacing: 240 },
  ]),
];

// 가짜 보드는 측정 전에 만든다. 간격 외의 크기·회전·배열 순서는 동일하게 유지한다.
function createBoard(count: number, spacing: number): ExistingSticker[] {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  return Array.from({ length: count }, (_, index) => ({
    posX: ((index % columns) - (columns - 1) / 2) * spacing,
    posY: (Math.floor(index / columns) - (rows - 1) / 2) * spacing,
    scale: 1,
    rotation: ((index % 3) - 1) * 15,
    zIndex: index + 1,
  }));
}

function halfExtent(sticker: ExistingSticker): number {
  const radians = (sticker.rotation * Math.PI) / 180;
  return 80 * sticker.scale * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)));
}

function expectSeparated(a: ExistingSticker, b: ExistingSticker, gap: number) {
  const minimumDistance = halfExtent(a) + halfExtent(b) + gap;
  expect(
    Math.abs(a.posX - b.posX) >= minimumDistance || Math.abs(a.posY - b.posY) >= minimumDistance,
  ).toBe(true);
}

for (const { name, count, spacing } of CASES) {
  const existing = createBoard(count, spacing);

  describe(`${name} / 기존 ${count}개 + 신규 6개`, () => {
    for (const seed of SEEDS) {
      // 기존 배치 테스트와 같은 난수 생성 방식. 시드별로 위치 탐색 순서를 고정한다.
      let randomState = seed;
      const random = () => {
        randomState = (randomState + 0x6d2b79f5) | 0;
        let value = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
      let result: Array<ExistingSticker & { id: string }> = [];

      bench(
        `seed ${seed}`,
        () => {
          randomState = seed;
          result = computePoissonInitialLayout(NEW_STICKERS, existing, random);
        },
        {
          warmupTime: 200,
          time: 1_000,
          iterations: 1_000,
          // 검증 비용은 측정에서 제외한다. 이미지 로딩·API·렌더링은 실행하지 않는다.
          teardown: () => {
            expect(result.map((sticker) => sticker.id)).toEqual(
              NEW_STICKERS.map((sticker) => sticker.id),
            );
            result.forEach((sticker, index) => {
              expect(Number.isFinite(sticker.posX) && Number.isFinite(sticker.posY)).toBe(true);
              expect(sticker.zIndex).toBe(count + index + 1);
              existing.forEach((other) => expectSeparated(sticker, other, STICKER_GROUP_GAP));
              result.slice(0, index).forEach((other) => expectSeparated(sticker, other, 0));
            });
          },
        },
      );
    }
  });
}
