'use client';

import type { paths } from '@ppotto/api';
import { memo, useLayoutEffect, useRef } from 'react';

import {
  drawOutlinedSticker,
  STICKER_OUTLINE_WIDTH,
  useStickerImage,
} from '@/shared/lib/sticker-raster';

import type { StickerTransform } from '../model/board-transform';

// 스티커 크기는 긴 변을 이 값으로 맞추고 비율을 유지한다
const STICKER_MAX_EDGE = 160;

type BoardDetail = NonNullable<
  paths['/boards/{boardId}']['get']['responses']['200']['content']['application/json']['data']
>;
type ApiSticker = BoardDetail['stickers'][number];

/**
 * badgeRotation은 명세에 있지만, 뱃지는 항상 스티커 회전의 반대로 고정돼야 한다는 디자인 결정에 따라
 * 무시하고 -rotation을 직접 계산해서 쓴다.
 *
 * posX/posY/zIndex는 API 스펙상 null 가능하지만, 그 null 처리는
 * BoardCanvas.tsx가 배치 계산 후 한 곳에서만 하고 나면 렌더링에 관여하는 이 타입 아래로는 항상
 * 실제 값이 있다고 다뤄도 되게 만든다 — 그래야 여기서부터 매번 방어 코드를 반복하지 않아도 된다.
 */
export type StickerData = Omit<ApiSticker, 'badgeRotation' | 'posX' | 'posY' | 'zIndex'> & {
  posX: number;
  posY: number;
  zIndex: number;
};

export function stickerZIndex(sticker: Pick<StickerData, 'zIndex'>): number {
  return (sticker.zIndex ?? 0) * 2;
}

export function badgeZIndex(sticker: Pick<StickerData, 'zIndex'>): number {
  return (sticker.zIndex ?? 0) * 2 + 1;
}

export function getPhotoSize(
  photoImage: HTMLImageElement | null,
  scale: number,
): { width: number; height: number } {
  const naturalWidth = photoImage?.naturalWidth ?? 0;
  const naturalHeight = photoImage?.naturalHeight ?? 0;
  const longestEdge = Math.max(naturalWidth, naturalHeight);
  const normalizeRatio = longestEdge > 0 ? STICKER_MAX_EDGE / longestEdge : 1;

  return {
    width: naturalWidth * normalizeRatio * scale,
    height: naturalHeight * normalizeRatio * scale,
  };
}

export function stickerDisplayedEdge(scale: number): number {
  return STICKER_MAX_EDGE * scale;
}

type StickerProps = {
  sticker: StickerData;
  selected?: boolean;
  transformOverride?: StickerTransform;
};

export const Sticker = memo(function Sticker({
  sticker,
  selected,
  transformOverride,
}: StickerProps) {
  const scale = transformOverride?.scale ?? sticker.scale;
  const photoImage = useStickerImage(sticker.imageUrl ?? undefined, stickerDisplayedEdge(scale));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = getPhotoSize(photoImage, scale);

  useLayoutEffect(() => {
    if (canvasRef.current && photoImage) {
      drawOutlinedSticker(canvasRef.current, photoImage, STICKER_MAX_EDGE);
    }
  }, [photoImage]);

  if (!photoImage || width <= 0 || height <= 0) return null;

  const x = transformOverride?.x ?? sticker.posX ?? 0;
  const y = transformOverride?.y ?? sticker.posY ?? 0;
  const rotation = transformOverride?.rotation ?? sticker.rotation;

  const outline = STICKER_OUTLINE_WIDTH * scale;

  return (
    <div
      data-sticker-id={sticker.id}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        zIndex: stickerZIndex(sticker),
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        willChange: 'transform',
        touchAction: 'none',
      }}
    >
      <div
        className="sticker-long-press-visual"
        style={{
          position: 'absolute',
          left: -outline,
          top: -outline,
          width: width + outline * 2,
          height: height + outline * 2,
          pointerEvents: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{
            width: '100%',
            height: '100%',
            filter: selected
              ? 'drop-shadow(0 12px 26px rgba(0,0,0,0.75))'
              : 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))',
          }}
        />
      </div>
    </div>
  );
});
