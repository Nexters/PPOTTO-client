'use client';

import Image, { type ImageProps } from 'next/image';

import { useStickerQuery } from '../api/sticker-queries';

type StickerPhotoImageProps = Omit<ImageProps, 'onError'> & {
  stickerId: string;
};

// signed URL 만료로 로드 실패 시 refetch, stickerId로 같은 쿼리 구독해 캐시 공유.
// GCS 직접 로드는 CORS가 없어 html-to-image 캡처(이미지 저장·공유)가 실패하므로
// next/image 최적화 경로(/_next/image, same-origin)로 서빙한다
export function StickerPhotoImage({ stickerId, alt, ...props }: StickerPhotoImageProps) {
  const { refetch } = useStickerQuery(stickerId);

  return <Image {...props} alt={alt} onError={() => refetch()} />;
}
