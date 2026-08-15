import { useEffect, useState } from 'react';

const STICKER_BITMAP_MAX_EDGE = 750;

export const STICKER_OUTLINE_WIDTH = 3;

function toProxiedImageSrc(src: string): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=750&q=75`;
}

export function useStickerImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = toProxiedImageSrc(src);
    img.onload = () => setImage(img);
  }, [src]);

  return image;
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
