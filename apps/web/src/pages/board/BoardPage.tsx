'use client';

import dynamic from 'next/dynamic';

import { DotBackground } from '@/shared/ui/DotBackground';
import { cn } from '@/shared/lib/cn';

import { BoardHeader } from './ui/BoardHeader';

const BoardCanvas = dynamic(() => import('./ui/BoardCanvas').then((mod) => mod.BoardCanvas), {
  ssr: false,
});

export function BoardPage() {
  return (
    <DotBackground>
      <div
        className={cn(
          'relative mx-auto flex h-dvh w-full max-w-107.5 items-center',
          'justify-center overflow-hidden',
        )}
      >
        <BoardHeader />
        <BoardCanvas />
      </div>
    </DotBackground>
  );
}
