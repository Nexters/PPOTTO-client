'use client';

import { rotatePoint } from '../model/geometry';

import { StickerBadge } from './StickerBadge';
import { badgeZIndex, type StickerData } from './Sticker';

type StickerBadgeMarkProps = {
  sticker: StickerData;
};

export function StickerBadgeMark({ sticker }: StickerBadgeMarkProps) {
  const offset = rotatePoint(
    { x: sticker.badgeOffsetX, y: sticker.badgeOffsetY },
    sticker.rotation,
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: (sticker.posX ?? 0) + offset.x,
        top: (sticker.posY ?? 0) + offset.y,
        zIndex: badgeZIndex(sticker),
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      <StickerBadge title={sticker.title} isNew={sticker.isNew} />
    </div>
  );
}
