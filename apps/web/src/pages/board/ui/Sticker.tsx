'use client';

import type { paths } from '@ppotto/api';
import { memo, useEffect, useState } from 'react';

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

// GCS 원본 URL을 next/image 프록시(same-origin)로 바꾼다.
function toProxiedImageSrc(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

// next.config.ts에 별도 images.imageSizes/deviceSizes 설정이 없어 next/image 기본값을 쓰는데,
// 그 목록에 없는 w 값을 요청하면 400이 나서 기본값 안에서만 골라야 한다.
const STICKER_IMAGE_WIDTH_STEPS = [128, 256, 384, 640, 750, 828, 1080];

// 스티커는 화면에 STICKER_MAX_EDGE(160) * scale CSS px로만 표시되는데
// 항상 1080px 원본을 받아오면 디코드/필터 비용이 실제 필요보다 훨씬 커진다.
// 표시 크기 기준으로 next/image가 지원하는 가장 작은 사이즈를 고른다.
function pickStickerImageWidth(scale: number): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  const targetWidth = STICKER_MAX_EDGE * scale * dpr;
  return (
    STICKER_IMAGE_WIDTH_STEPS.find((step) => step >= targetWidth) ??
    STICKER_IMAGE_WIDTH_STEPS[STICKER_IMAGE_WIDTH_STEPS.length - 1]!
  );
}

const OUTLINE_RADIUS_CSS_PX = 3;
const OUTLINE_STEPS = 16;

function bakeStickerOutline(source: HTMLImageElement, scale: number): string {
  const w = source.naturalWidth;
  const h = source.naturalHeight;
  const displayedLongestEdge = STICKER_MAX_EDGE * scale;
  const rawRadius = (OUTLINE_RADIUS_CSS_PX * Math.max(w, h)) / displayedLongestEdge;
  const pad = Math.ceil(rawRadius) + 2;

  const silhouette = document.createElement('canvas');
  silhouette.width = w;
  silhouette.height = h;
  const silhouetteCtx = silhouette.getContext('2d')!;
  silhouetteCtx.drawImage(source, 0, 0);
  silhouetteCtx.globalCompositeOperation = 'source-in';
  silhouetteCtx.fillStyle = '#fff';
  silhouetteCtx.fillRect(0, 0, w, h);

  const canvas = document.createElement('canvas');
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < OUTLINE_STEPS; i++) {
    const angle = (i / OUTLINE_STEPS) * Math.PI * 2;
    ctx.drawImage(silhouette, pad + Math.cos(angle) * rawRadius, pad + Math.sin(angle) * rawRadius);
  }
  ctx.drawImage(source, pad, pad);

  return canvas.toDataURL('image/png');
}

export function useStickerImage(src: string | undefined, scale: number) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const width = pickStickerImageWidth(scale);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;

    const raw = new window.Image();
    raw.src = toProxiedImageSrc(src, width);
    raw.onload = () => {
      if (cancelled) return;
      const outlined = new window.Image();
      outlined.onload = () => {
        if (!cancelled) setImage(outlined);
      };
      outlined.src = bakeStickerOutline(raw, scale);
    };

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, width]);

  return image;
}

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
  const photoImage = useStickerImage(sticker.imageUrl ?? undefined, scale);
  const { width, height } = getPhotoSize(photoImage, scale);

  if (!photoImage || width <= 0 || height <= 0) return null;

  const x = transformOverride?.x ?? sticker.posX ?? 0;
  const y = transformOverride?.y ?? sticker.posY ?? 0;
  const rotation = transformOverride?.rotation ?? sticker.rotation;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 보드 좌표계에 직접 배치하는 스티커라 next/image 최적화 대상이 아님
    <img
      src={photoImage.src}
      alt=""
      data-sticker-id={sticker.id}
      draggable={false}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        zIndex: stickerZIndex(sticker),
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        filter: selected
          ? 'drop-shadow(0 12px 26px rgba(0,0,0,0.75))'
          : 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))',
        willChange: 'transform',
        touchAction: 'none',
      }}
    />
  );
});
