import { useEffect, useReducer } from 'react';

const STICKER_BITMAP_MAX_EDGE = 750;

export const STICKER_OUTLINE_WIDTH = 3;

/**
 * 세션 동안 로드한 스티커 이미지 보관함. GCS 서명 URL은 응답마다 서명이 달라져
 * 브라우저 캐시가 매번 빗나가므로, 서명 쿼리를 뗀 객체 경로를 키로 디코딩된
 * 이미지를 재사용한다 — 보드에서 로드한 이미지를 리캡이 즉시 쓸 수 있다.
 */
const stickerImageCache = new Map<string, HTMLImageElement>();

function cacheKeyOf(src: string): string {
  try {
    const url = new URL(src, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return src;
  }
}

function readCached(src: string | undefined): HTMLImageElement | null {
  const cached = src ? stickerImageCache.get(cacheKeyOf(src)) : undefined;
  return cached?.complete && cached.naturalWidth > 0 ? cached : null;
}

function loadStickerImage(src: string): HTMLImageElement {
  const key = cacheKeyOf(src);
  let img = stickerImageCache.get(key);
  // 로드에 실패했던 항목은 버리고 새로 시도한다
  if (img?.complete && img.naturalWidth === 0) {
    stickerImageCache.delete(key);
    img = undefined;
  }
  if (!img) {
    img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.addEventListener('error', () => stickerImageCache.delete(key));
    stickerImageCache.set(key, img);
  }
  return img;
}

export async function preloadStickerImages(sources: Array<string | null | undefined>) {
  const queue = [...new Set(sources.filter((src): src is string => !!src))];
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(2, queue.length) }, async () => {
      while (next < queue.length) {
        const src = queue[next++]!;
        await loadStickerImage(src)
          .decode()
          .catch(() => undefined);
      }
    }),
  );
}

function useStickerImageInternal(src: string | undefined, load: boolean) {
  // 캐시는 렌더에서 직접 읽는다 — 이미 받아둔 이미지를 한 프레임도 비우지 않고 그리려고.
  // 항목은 null → 이미지로만 바뀌므로 렌더 중 읽어도 값이 뒤집히지 않는다
  const [, onSettled] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (!src) return;

    const img = load ? loadStickerImage(src) : stickerImageCache.get(cacheKeyOf(src));
    if (!img || (img.complete && img.naturalWidth > 0)) return;

    img.addEventListener('load', onSettled);
    return () => {
      img.removeEventListener('load', onSettled);
    };
  }, [load, src]);

  return readCached(src);
}

export function useStickerImage(src: string | undefined) {
  return useStickerImageInternal(src, true);
}

export function useCachedStickerImage(src: string | undefined) {
  return useStickerImageInternal(src, false);
}

export function drawOutlinedSticker(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  displayMaxEdge: number,
) {
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  if (longestEdge <= 0) return;

  const resizeRatio = Math.min(1, STICKER_BITMAP_MAX_EDGE / longestEdge);
  const width = Math.max(1, Math.round(image.naturalWidth * resizeRatio));
  const height = Math.max(1, Math.round(image.naturalHeight * resizeRatio));
  const outline = Math.max(
    1,
    Math.round((STICKER_OUTLINE_WIDTH * Math.max(width, height)) / displayMaxEdge),
  );

  canvas.width = width + outline * 2;
  canvas.height = height + outline * 2;

  const context = canvas.getContext('2d');
  if (!context) return;

  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const maskContext = mask.getContext('2d');
  if (!maskContext) return;

  maskContext.imageSmoothingQuality = 'high';
  maskContext.drawImage(image, 0, 0, width, height);
  maskContext.globalCompositeOperation = 'source-in';
  maskContext.fillStyle = '#fff';
  maskContext.fillRect(0, 0, width, height);

  const samples = Math.max(16, Math.ceil(2 * Math.PI * outline));
  context.imageSmoothingQuality = 'high';
  context.drawImage(mask, outline, outline);
  for (let index = 0; index < samples; index += 1) {
    const angle = (index / samples) * Math.PI * 2;
    context.drawImage(
      mask,
      outline + Math.cos(angle) * outline,
      outline + Math.sin(angle) * outline,
    );
  }
  context.drawImage(image, outline, outline, width, height);
}
