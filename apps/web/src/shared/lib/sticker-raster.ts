import { useEffect, useReducer } from 'react';

const STICKER_BITMAP_MAX_EDGE = 750;

export const STICKER_OUTLINE_WIDTH = 3;

// next.config.ts에 별도 images.imageSizes/deviceSizes 설정이 없어 next/image 기본값을 쓰는데,
// 그 목록에 없는 w 값을 요청하면 400이 나서 기본값 안에서만 골라야 한다.
const IMAGE_WIDTH_STEPS = [128, 256, 384, 640, 750, 828, 1080];

// 스티커는 displayedEdge CSS px로만 표시되는데 항상 원본을 받아오면 전송·디코드 비용이
// 실제 필요보다 훨씬 크다. 표시 크기 기준으로 지원되는 가장 작은 사이즈를 고른다.
function pickImageWidth(displayedEdge: number): number {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
  const target = displayedEdge * dpr;
  return IMAGE_WIDTH_STEPS.find((step) => step >= target) ?? IMAGE_WIDTH_STEPS.at(-1)!;
}

function toProxiedImageSrc(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

/**
 * 세션 동안 로드한 스티커 이미지 보관함. GCS 서명 URL은 응답마다 서명이 달라져
 * 브라우저 캐시가 매번 빗나가므로, 서명 쿼리를 뗀 객체 경로를 키로 디코딩된
 * 이미지를 재사용한다 — 보드에서 로드한 이미지를 리캡이 즉시 쓸 수 있다.
 */
const stickerImageCache = new Map<string, HTMLImageElement>();

// 요청 폭이 다르면 다른 비트맵이므로 키를 나눈다. 보드(160)와 리캡(176)은 보통 같은
// 단계로 떨어져서 그대로 공유된다.
function cacheKeyPrefixOf(src: string): string {
  try {
    const url = new URL(src, window.location.origin);
    return `${url.origin}${url.pathname}@`;
  } catch {
    return `${src}@`;
  }
}

function cacheKeyOf(src: string, width: number): string {
  return `${cacheKeyPrefixOf(src)}${width}`;
}

function readCached(src: string | undefined, width: number): HTMLImageElement | null {
  const cached = src ? stickerImageCache.get(cacheKeyOf(src, width)) : undefined;
  return cached?.complete && cached.naturalWidth > 0 ? cached : null;
}

// 원하는 폭의 이미지가 아직 없을 때, 같은 스티커를 다른 폭으로 이미 받아둔 게 있으면
// 그거라도 반환한다. 화질을 위해 가장 큰 걸 고른다.
function readAnyCached(src: string): HTMLImageElement | null {
  const prefix = cacheKeyPrefixOf(src);
  let best: HTMLImageElement | null = null;
  for (const [key, img] of stickerImageCache) {
    if (!key.startsWith(prefix)) continue;
    if (!img.complete || img.naturalWidth === 0) continue;
    if (!best || img.naturalWidth > best.naturalWidth) best = img;
  }
  return best;
}

function loadStickerImage(src: string, width: number): HTMLImageElement {
  const key = cacheKeyOf(src, width);
  let img = stickerImageCache.get(key);
  // 로드에 실패했던 항목은 버리고 새로 시도한다
  if (img?.complete && img.naturalWidth === 0) {
    stickerImageCache.delete(key);
    img = undefined;
  }
  if (!img) {
    img = new window.Image();
    img.src = toProxiedImageSrc(src, width);
    img.addEventListener('error', () => stickerImageCache.delete(key));
    stickerImageCache.set(key, img);
  }
  return img;
}

function useStickerImageInternal(
  src: string | undefined,
  displayedEdge: number,
  withFallback: boolean,
) {
  // 캐시는 렌더에서 직접 읽는다 — 이미 받아둔 이미지를 한 프레임도 비우지 않고 그리려고.
  // 항목은 null → 이미지로만 바뀌므로 렌더 중 읽어도 값이 뒤집히지 않는다
  const [, onSettled] = useReducer((count: number) => count + 1, 0);
  const width = pickImageWidth(displayedEdge);

  useEffect(() => {
    if (!src) return;

    const img = loadStickerImage(src, width);
    if (img.complete && img.naturalWidth > 0) return;

    img.addEventListener('load', onSettled);
    return () => {
      img.removeEventListener('load', onSettled);
    };
  }, [src, width]);

  const exact = readCached(src, width);
  if (exact || !withFallback || !src) return exact;
  return readAnyCached(src);
}

export function useStickerImage(src: string | undefined, displayedEdge: number) {
  return useStickerImageInternal(src, displayedEdge, false);
}

export function useStickerImageWithFallback(src: string | undefined, displayedEdge: number) {
  return useStickerImageInternal(src, displayedEdge, true);
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
