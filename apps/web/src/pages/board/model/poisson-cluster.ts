import type { LayoutSlot } from './board-layout';
import { centroid, type Point } from './geometry';

const STICKER_DIAMETER = 160;
export const STICKER_GROUP_GAP = 40;
const TARGET_FILL = 0.3;

const STICKER_RADIUS = STICKER_DIAMETER / 2;
const INTERNAL_GAP = 12;
const CANDIDATE_ATTEMPTS = 200;
const RADIUS_GROWTH = 1.1;
const MAX_RADIUS_EXPANSIONS = 50;
const ROTATION_RANGE_DEG = 15;
const BADGE_OFFSET = { x: 0, y: 60 };

type CollisionBox = Point & { halfExtent: number };

type GroupSticker<T> = CollisionBox & {
  sticker: T;
  rotation: number;
};

type BoardStickerGroup<T> = {
  stickers: GroupSticker<T>[];
  radius: number;
};

export type ExistingSticker = {
  posX: number;
  posY: number;
  zIndex: number;
  scale: number;
  rotation: number;
};

function pointInDisk(radius: number, random: () => number): Point {
  const angle = random() * Math.PI * 2;
  const radialDistance = Math.sqrt(random()) * radius;
  return {
    x: Math.cos(angle) * radialDistance,
    y: Math.sin(angle) * radialDistance,
  };
}

function stickerHalfExtent(scale: number, rotation: number): number {
  const radians = (rotation * Math.PI) / 180;
  return STICKER_RADIUS * scale * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)));
}

function boxesOverlap(a: CollisionBox, b: CollisionBox, gap: number): boolean {
  const minimumDistance = a.halfExtent + b.halfExtent + gap;
  return Math.abs(a.x - b.x) < minimumDistance && Math.abs(a.y - b.y) < minimumDistance;
}

function createBoardStickerGroup<T extends { scale?: number }>(
  stickers: T[],
  random: () => number,
): BoardStickerGroup<T> {
  const placed: GroupSticker<T>[] = [];
  let placementRadius = STICKER_DIAMETER * Math.max(1.1, Math.sqrt(stickers.length - 1) * 0.75);

  for (const sticker of stickers) {
    const rotation = (random() * 2 - 1) * ROTATION_RANGE_DEG;
    const halfExtent = stickerHalfExtent(sticker.scale ?? 1, rotation);
    let point = { x: 0, y: 0 };

    if (placed.length > 0) {
      let found = false;

      for (let expansion = 0; expansion < MAX_RADIUS_EXPANSIONS && !found; expansion += 1) {
        for (let attempt = 0; attempt < CANDIDATE_ATTEMPTS; attempt += 1) {
          const candidate = { ...pointInDisk(placementRadius, random), halfExtent };
          if (placed.every((other) => !boxesOverlap(candidate, other, INTERNAL_GAP))) {
            point = candidate;
            found = true;
            break;
          }
        }
        if (!found) placementRadius *= RADIUS_GROWTH;
      }

      if (!found) throw new Error('Sticker group placement exhausted its radius expansions');
    }

    placed.push({ ...point, halfExtent, rotation, sticker });
  }

  const minX = Math.min(...placed.map((item) => item.x - item.halfExtent));
  const maxX = Math.max(...placed.map((item) => item.x + item.halfExtent));
  const minY = Math.min(...placed.map((item) => item.y - item.halfExtent));
  const maxY = Math.max(...placed.map((item) => item.y + item.halfExtent));
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const normalized = placed.map((item) => ({
    ...item,
    x: item.x - center.x,
    y: item.y - center.y,
  }));

  return {
    stickers: normalized,
    radius: Math.max(
      ...normalized.map((item) =>
        Math.hypot(Math.abs(item.x) + item.halfExtent, Math.abs(item.y) + item.halfExtent),
      ),
    ),
  };
}

function existingStickerBox(sticker: ExistingSticker): CollisionBox {
  return {
    x: sticker.posX,
    y: sticker.posY,
    halfExtent: stickerHalfExtent(sticker.scale ?? 1, sticker.rotation ?? 0),
  };
}

function placedBoardGroup<T extends { id: string; type: string; scale?: number }>(
  group: BoardStickerGroup<T>,
  center: Point,
  existingStickers: ExistingSticker[],
): (T & LayoutSlot & { zIndex: number })[] {
  const maxExistingZIndex = existingStickers.reduce(
    (max, sticker) => Math.max(max, sticker.zIndex),
    0,
  );

  return group.stickers.map((item, index) => ({
    ...item.sticker,
    posX: center.x + item.x,
    posY: center.y + item.y,
    rotation: item.rotation,
    badgeOffsetX: BADGE_OFFSET.x,
    badgeOffsetY: BADGE_OFFSET.y,
    zIndex: maxExistingZIndex + index + 1,
  }));
}

export function computePoissonInitialLayout<T extends { id: string; type: string; scale?: number }>(
  newStickers: T[],
  existingStickers: ExistingSticker[],
  random: () => number = Math.random,
): (T & LayoutSlot & { zIndex: number })[] {
  if (newStickers.length === 0) return [];

  const group = createBoardStickerGroup(newStickers, random);
  if (existingStickers.length === 0) {
    return placedBoardGroup(group, { x: 0, y: 0 }, existingStickers);
  }

  const existingBoxes = existingStickers.map(existingStickerBox);
  const clusterCenter = centroid(existingBoxes);
  const currentRadius = Math.max(
    ...existingBoxes.map((box) =>
      Math.hypot(
        Math.abs(box.x - clusterCenter.x) + box.halfExtent,
        Math.abs(box.y - clusterCenter.y) + box.halfExtent,
      ),
    ),
  );
  const paddedArea =
    existingBoxes.reduce((sum, box) => sum + (box.halfExtent * 2 + STICKER_GROUP_GAP) ** 2, 0) +
    Math.PI * (group.radius + STICKER_GROUP_GAP / 2) ** 2;
  let clusterRadius = Math.max(
    currentRadius,
    group.radius,
    Math.sqrt(paddedArea / (Math.PI * TARGET_FILL)),
  );

  // ponytail: O(n²) AABB scan is enough for current board sizes; add a spatial index if profiling says otherwise.
  for (let expansion = 0; expansion < MAX_RADIUS_EXPANSIONS; expansion += 1) {
    const candidateRadius = Math.max(0, clusterRadius - group.radius);

    for (let attempt = 0; attempt < CANDIDATE_ATTEMPTS; attempt += 1) {
      const offset = pointInDisk(candidateRadius, random);
      const center = { x: clusterCenter.x + offset.x, y: clusterCenter.y + offset.y };
      const overlaps = group.stickers.some((item) => {
        const candidate = {
          x: center.x + item.x,
          y: center.y + item.y,
          halfExtent: item.halfExtent,
        };
        return existingBoxes.some((box) => boxesOverlap(candidate, box, STICKER_GROUP_GAP));
      });

      if (!overlaps) return placedBoardGroup(group, center, existingStickers);
    }

    clusterRadius *= RADIUS_GROWTH;
  }

  throw new Error('Poisson board placement exhausted its radius expansions');
}
