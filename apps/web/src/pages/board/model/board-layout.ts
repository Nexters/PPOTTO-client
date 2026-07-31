/**
 * 스티커 초기 배치. PRD상 테마(=스티커) 수는 4~6개로 고정 범위라, 개수별로 미리 튜닝해둔
 * 슬롯 세트를 쓴다. 5개짜리는 Figma 실측값 그대로다. 기준 좌표계는 360×740(REFERENCE_WIDTH/HEIGHT).
 *
 * 서버가 스티커를 처음 만들 때 내려주는 posX/posY는 무시하고, 여기서 계산한 값으로 덮어써서
 * 화면에 반영한 뒤 API로 저장한다.
 */

export type LayoutSlot = {
  posX: number;
  posY: number;
  rotation: number;
  badgeOffsetX: number;
  badgeOffsetY: number;
};

const LAYOUT_PRESETS: Record<4 | 5 | 6, LayoutSlot[]> = {
  4: [
    { posX: 110, posY: 220, rotation: -14, badgeOffsetX: 42, badgeOffsetY: -38 },
    { posX: 255, posY: 260, rotation: 11, badgeOffsetX: -40, badgeOffsetY: 45 },
    { posX: 80, posY: 490, rotation: 9, badgeOffsetX: 38, badgeOffsetY: 48 },
    { posX: 275, posY: 460, rotation: -12, badgeOffsetX: -35, badgeOffsetY: -42 },
  ],
  5: [
    { posX: 188.9, posY: 203.9, rotation: -12.95, badgeOffsetX: 45.17, badgeOffsetY: -39.78 },
    { posX: 105.35, posY: 315.35, rotation: 12.43, badgeOffsetX: -24.79, badgeOffsetY: 49.68 },
    { posX: 248.69, posY: 459.56, rotation: 0, badgeOffsetX: 46, badgeOffsetY: 75 },
    { posX: 102.08, posY: 459.55, rotation: -17.76, badgeOffsetX: -30.42, badgeOffsetY: 42.49 },
    { posX: 263.23, posY: 320.21, rotation: 12.69, badgeOffsetX: 11.19, badgeOffsetY: -54.71 },
  ],
  6: [
    { posX: 100, posY: 190, rotation: -11, badgeOffsetX: 40, badgeOffsetY: -35 },
    { posX: 260, posY: 210, rotation: 13, badgeOffsetX: -38, badgeOffsetY: 40 },
    { posX: 90, posY: 370, rotation: 8, badgeOffsetX: 36, badgeOffsetY: 44 },
    { posX: 270, posY: 390, rotation: -9, badgeOffsetX: -40, badgeOffsetY: -38 },
    { posX: 105, posY: 540, rotation: -13, badgeOffsetX: 38, badgeOffsetY: 42 },
    { posX: 255, posY: 560, rotation: 10, badgeOffsetX: -35, badgeOffsetY: -40 },
  ],
};

function presetFor(count: number): LayoutSlot[] {
  const clamped = Math.min(6, Math.max(4, count)) as 4 | 5 | 6;
  return LAYOUT_PRESETS[clamped];
}

// TEXT 카드는 이미지 스티커보다 위쪽 여백이 좁아서, 프리셋의 범용 badgeOffsetY를 그대로 쓰면
// 뱃지가 본문 첫 줄을 가린다. TEXT일 때는 이 값으로 항상 덮어써서 카드 위로 충분히 띄운다.
const TEXT_BADGE_OFFSET_Y = -56;

/**
 * 스티커 배열에 슬롯(posX/posY/rotation/badgeOffsetX/badgeOffsetY)과 zIndex(배열 순서)를 매긴다.
 * 슬롯보다 스티커가 많으면(4~6 범위 밖) 슬롯을 순환시켜 재사용한다.
 */
export function computeInitialLayout<T extends { id: string; type: string }>(
  stickers: T[],
): (T & LayoutSlot & { zIndex: number })[] {
  const slots = presetFor(stickers.length);

  return stickers.map((sticker, index) => {
    const slot = slots[index % slots.length]!;
    return {
      ...sticker,
      ...slot,
      badgeOffsetY: sticker.type === 'TEXT' ? TEXT_BADGE_OFFSET_Y : slot.badgeOffsetY,
      zIndex: index + 1,
    };
  });
}
