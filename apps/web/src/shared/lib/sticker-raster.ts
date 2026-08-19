import { useEffect, useReducer } from 'react';

const STICKER_BITMAP_MAX_EDGE = 750;
const STICKER_CACHE_NAME = 'ppotto-stickers-v1';

export const STICKER_OUTLINE_WIDTH = 3;

/**
 * GCS 서명 쿼리를 뗀 객체 경로를 공통 키로 사용한다. 같은 세션에서는 디코딩된
 * 이미지를 재사용하고, 다음 실행에서는 Cache API에 저장한 응답을 복원한다.
 */
type StickerImageEntry = { image: HTMLImageElement; ready: Promise<void> };

const stickerImageCache = new Map<string, StickerImageEntry>();
const pendingCacheWrites = new Set<Promise<void>>();
let cacheGeneration = 0;

function cacheKeyOf(src: string): string {
  try {
    const url = new URL(src, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return src;
  }
}

function readCached(src: string | undefined): HTMLImageElement | null {
  const image = src ? stickerImageCache.get(cacheKeyOf(src))?.image : undefined;
  return image?.complete && image.naturalWidth > 0 ? image : null;
}

async function resolveStickerImageSource(src: string): Promise<string> {
  if (!('caches' in window)) return src;

  try {
    const generation = cacheGeneration;
    const cache = await window.caches.open(STICKER_CACHE_NAME);
    const key = new Request(cacheKeyOf(src));
    const cached = await cache.match(key);
    if (cached?.ok) return URL.createObjectURL(await cached.blob());

    const response = await fetch(src, { mode: 'cors' });
    if (!response.ok) return src;

    if (generation === cacheGeneration) {
      const write = cache.put(key, response.clone()).catch(() => undefined);
      pendingCacheWrites.add(write);
      void write.finally(() => pendingCacheWrites.delete(write));
    }
    return URL.createObjectURL(await response.blob());
  } catch {
    return src;
  }
}

function setImageSource(image: HTMLImageElement, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const objectUrl = src.startsWith('blob:') ? src : undefined;
    const settle = (callback: () => void) => {
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      callback();
    };
    const onLoad = () => settle(resolve);
    const onError = () => settle(reject);

    image.addEventListener('load', onLoad);
    image.addEventListener('error', onError);
    image.src = src;
  });
}

function loadStickerImage(src: string): StickerImageEntry {
  const key = cacheKeyOf(src);
  const cached = stickerImageCache.get(key);
  if (cached) return cached;

  const image = new window.Image();
  image.crossOrigin = 'anonymous';
  const ready = resolveStickerImageSource(src).then((resolvedSrc) =>
    setImageSource(image, resolvedSrc).catch(() => {
      if (resolvedSrc === src) throw new Error('스티커 이미지를 불러오지 못했습니다.');
      return setImageSource(image, src);
    }),
  );
  const entry = { image, ready };
  stickerImageCache.set(key, entry);
  void ready.catch(() => {
    if (stickerImageCache.get(key) === entry) stickerImageCache.delete(key);
  });
  return entry;
}

export async function preloadStickerImages(sources: Array<string | null | undefined>) {
  const queue = [
    ...new Map(
      sources.filter((src): src is string => !!src).map((src) => [cacheKeyOf(src), src]),
    ).values(),
  ];
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(2, queue.length) }, async () => {
      while (next < queue.length) {
        const src = queue[next++]!;
        await loadStickerImage(src).ready.catch(() => undefined);
      }
    }),
  );
}

export async function clearStickerImageCache() {
  cacheGeneration += 1;
  stickerImageCache.clear();
  if (!('caches' in window)) return;
  await Promise.allSettled([...pendingCacheWrites]);
  await window.caches.delete(STICKER_CACHE_NAME).catch(() => undefined);
}

function useStickerImageInternal(src: string | undefined, load: boolean) {
  // 캐시는 렌더에서 직접 읽는다 — 이미 받아둔 이미지를 한 프레임도 비우지 않고 그리려고.
  // 항목은 null → 이미지로만 바뀌므로 렌더 중 읽어도 값이 뒤집히지 않는다
  const [, onSettled] = useReducer((count: number) => count + 1, 0);
  const image = readCached(src);

  useEffect(() => {
    if (!src || image) return;

    const entry = load ? loadStickerImage(src) : stickerImageCache.get(cacheKeyOf(src));
    if (!entry) return;

    let active = true;
    const settle = () => {
      if (active) onSettled();
    };
    void entry.ready.then(settle, settle);
    return () => {
      active = false;
    };
  }, [image, load, src]);

  return image;
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
