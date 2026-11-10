import type { ReactNode, Ref } from 'react';

import { cn } from '@/shared/lib/cn';

import { SHARED_BOARD_PADDING_TOP } from './shared-board-safe-area';

type SharedBoardHeaderProps = {
  children: ReactNode;
  ref?: Ref<HTMLElement>;
};

// 아래로 갈수록 투명해지는 상단 영역 — 보드가 로고·제목 밑으로 흐르듯 보이게 한다 (Figma 3356:18674 Top)
export function SharedBoardHeader({ children, ref }: SharedBoardHeaderProps) {
  return (
    <header
      ref={ref}
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-8',
        'px-6 pb-6',
      )}
      style={{
        paddingTop: SHARED_BOARD_PADDING_TOP,
        backgroundImage: 'linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, #000 54.129%)',
      }}
    >
      {children}
    </header>
  );
}
