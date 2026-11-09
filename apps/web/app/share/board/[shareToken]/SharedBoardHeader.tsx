import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

// 아래로 갈수록 투명해지는 상단 영역 — 보드가 로고·제목 밑으로 흐르듯 보이게 한다 (Figma 3356:18674 Top)
export function SharedBoardHeader({ children }: { children: ReactNode }) {
  return (
    <header
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-8',
        'px-6 pt-16 pb-6',
      )}
      style={{ backgroundImage: 'linear-gradient(0deg, rgba(0, 0, 0, 0) 0%, #000 54.129%)' }}
    >
      {children}
    </header>
  );
}
