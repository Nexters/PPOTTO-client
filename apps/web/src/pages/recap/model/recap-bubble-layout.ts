export type BubbleSize = { width: number; height: number };
export type PlacedBubble = { id: string; posX: number; posY: number };

type Rect = { posX: number; posY: number } & BubbleSize;

const GAP = 8;
const ANGLE_STEPS = 16;
const RADIUS_STEP = 10;
const MAX_RINGS = 60;

function overlaps(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.posX - b.posX) < (a.width + b.width) / 2 + GAP &&
    Math.abs(a.posY - b.posY) < (a.height + b.height) / 2 + GAP
  );
}

function fitsInContainer(rect: Rect, container: { width: number; height: number }): boolean {
  return (
    Math.abs(rect.posX) + rect.width / 2 <= container.width / 2 &&
    Math.abs(rect.posY) + rect.height / 2 <= container.height / 2
  );
}

function findNonOverlappingPosition(
  size: BubbleSize,
  stickerBounds: BubbleSize,
  placed: Rect[],
  container: { width: number; height: number },
  random: () => number,
): { posX: number; posY: number } {
  const angleStart = random() * Math.PI * 2;
  const stickerRect: Rect = { posX: 0, posY: 0, ...stickerBounds };

  let candidate: Rect = { posX: 0, posY: 0, ...size };

  for (let ring = 1; ring <= MAX_RINGS; ring += 1) {
    const radius = ring * RADIUS_STEP;

    for (let step = 0; step < ANGLE_STEPS; step += 1) {
      const angle = angleStart + (step / ANGLE_STEPS) * Math.PI * 2;
      candidate = {
        posX: Math.cos(angle) * radius,
        posY: Math.sin(angle) * radius,
        ...size,
      };

      if (!fitsInContainer(candidate, container)) continue;
      if (overlaps(candidate, stickerRect)) continue;
      if (placed.some((p) => overlaps(candidate, p))) continue;

      return { posX: candidate.posX, posY: candidate.posY };
    }
  }

  // 끝까지 못 찾은 경우 — 마지막으로 검사한 후보(겹치거나 경계 밖일 수 있음)를 그대로 반환
  return { posX: candidate.posX, posY: candidate.posY };
}

// 좌표는 스티커 중심 기준 오프셋 — 렌더링의 translate(posX, posY)와 동일한 좌표계
export function placeBubbles(
  bubbles: (BubbleSize & { id: string })[],
  stickerBounds: BubbleSize,
  container: { width: number; height: number },
  random: () => number = Math.random,
): PlacedBubble[] {
  const placed: Rect[] = [];

  for (const bubble of bubbles) {
    const position = findNonOverlappingPosition(bubble, stickerBounds, placed, container, random);
    placed.push({ ...position, width: bubble.width, height: bubble.height });
  }

  return bubbles.map((bubble, index) => ({
    id: bubble.id,
    posX: placed[index]!.posX,
    posY: placed[index]!.posY,
  }));
}
