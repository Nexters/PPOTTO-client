'use client';

import Image, { type ImageProps } from 'next/image';

import { useStickerQuery } from '../api/sticker-queries';

type StickerPhotoImageProps = Omit<ImageProps, 'onError'> & {
  stickerId: string;
};

// signed URL 만료로 로드 실패 시 refetch, stickerId로 같은 쿼리 구독해 캐시 공유
export function StickerPhotoImage({ stickerId, alt, ...props }: StickerPhotoImageProps) {
  const { refetch } = useStickerQuery(stickerId);

  return <Image {...props} unoptimized alt={alt} onError={() => refetch()} />;
}
