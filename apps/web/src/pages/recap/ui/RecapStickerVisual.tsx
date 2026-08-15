import Image from 'next/image';

import type { StickerComment } from '@/entities/sticker/api/sticker-api';
import { Bubble } from '@/shared/ui/Bubble';

type RecapStickerVisualProps = {
  imageUrl: string;
  floatComments: StickerComment[];
};

export function RecapStickerVisual({ imageUrl, floatComments }: RecapStickerVisualProps) {
  return (
    <div className="relative flex h-52 w-full items-center justify-center">
      <svg width="0" height="0" className="absolute">
        <filter id="sticker-outline">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="dilated" />
          <feFlood floodColor="white" result="color" />
          <feComposite in="color" in2="dilated" operator="in" result="outline" />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      <div className="relative h-44 w-44">
        <Image
          src={imageUrl}
          alt=""
          fill
          unoptimized
          sizes="176px"
          className="object-contain"
          style={{ filter: 'url(#sticker-outline)' }}
        />
      </div>
      {floatComments.map((comment) => (
        <div
          key={comment.id}
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${comment.posX ?? 0}px, ${comment.posY ?? 0}px)`,
          }}
        >
          <Bubble
            content={comment.content}
            direction={(comment.posX ?? 0) < 0 ? 'right' : 'left'}
          />
        </div>
      ))}
    </div>
  );
}
