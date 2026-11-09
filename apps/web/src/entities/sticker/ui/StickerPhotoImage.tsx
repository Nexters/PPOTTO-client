'use client';

import Image, { type ImageProps } from 'next/image';

import { useImageErrorRecovery } from '@/shared/lib/use-image-error-recovery';

import { useStickerQuery } from '../api/sticker-queries';

type StickerPhotoImageProps = Omit<ImageProps, 'onError'> & {
  stickerId: string;
};

export function StickerPhotoImage({ stickerId, alt, ...props }: StickerPhotoImageProps) {
  const { refetch } = useStickerQuery(stickerId);
  const recoverImage = useImageErrorRecovery(() => {
    void refetch();
  });

  return <Image {...props} alt={alt} crossOrigin="anonymous" onError={recoverImage} />;
}
