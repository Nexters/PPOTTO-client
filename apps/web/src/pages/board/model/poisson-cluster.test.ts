import { describe, expect, it } from 'vitest';

import { computePoissonInitialLayout, STICKER_GROUP_GAP } from './poisson-cluster';

function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function halfExtent(rotation: number, scale = 1): number {
  const radians = (rotation * Math.PI) / 180;
  return 80 * scale * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)));
}

describe('Poisson board layout', () => {
  it('첫 그룹을 0,0 중심에 놓고 크기 조절된 기존 스티커를 피한다', () => {
    const random = seededRandom(200);
    const first = computePoissonInitialLayout(
      [
        { id: 'first-a', type: 'IMAGE', scale: 1 },
        { id: 'first-b', type: 'IMAGE', scale: 1 },
      ],
      [],
      random,
    );
    const minX = Math.min(...first.map((sticker) => sticker.posX - halfExtent(sticker.rotation)));
    const maxX = Math.max(...first.map((sticker) => sticker.posX + halfExtent(sticker.rotation)));
    const minY = Math.min(...first.map((sticker) => sticker.posY - halfExtent(sticker.rotation)));
    const maxY = Math.max(...first.map((sticker) => sticker.posY + halfExtent(sticker.rotation)));

    expect((minX + maxX) / 2).toBeCloseTo(0);
    expect((minY + maxY) / 2).toBeCloseTo(0);

    const next = computePoissonInitialLayout(
      [
        { id: 'next-a', type: 'IMAGE', scale: 1 },
        { id: 'next-b', type: 'IMAGE', scale: 1 },
      ],
      [{ posX: 0, posY: 0, zIndex: 3, scale: 4, rotation: 45 }],
      random,
    );
    const existingHalfExtent = halfExtent(45, 4);

    next.forEach((sticker) => {
      const minimumDistance = existingHalfExtent + halfExtent(sticker.rotation) + STICKER_GROUP_GAP;
      expect(
        Math.abs(sticker.posX) >= minimumDistance || Math.abs(sticker.posY) >= minimumDistance,
      ).toBe(true);
    });
  });
});
