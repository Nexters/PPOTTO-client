import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

/** 빈 보드 스티커의 제목 말풍선. 텍스트 길이에 맞춰 가로로 늘고 준다. */
export function EmptyBoardStickerTitle({
  title,
  className,
  ...props
}: ComponentProps<'div'> & { title: string }) {
  return (
    <div className={cn('relative inline-block rotate-[6.18deg]', className)} {...props}>
      <div
        className={cn(
          'flex h-[30px] items-center justify-center rounded-full bg-white px-4',
          'text-[12px] font-medium tracking-[-0.36px] whitespace-nowrap text-gray-900',
        )}
      >
        {title}
      </div>
      {/* 빨간 점은 말풍선 우측 상단 고정 */}
      <span
        className={cn(
          'absolute -top-1 -right-0 size-3 rounded-full',
          'border-2 border-white bg-[#FF3F4B]',
        )}
      />
    </div>
  );
}
