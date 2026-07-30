'use client';

import dynamic from 'next/dynamic';

import { DotBackground } from '@/shared/ui/DotBackground';

const BoardCanvas = dynamic(() => import('./ui/BoardCanvas').then((mod) => mod.BoardCanvas), {
  ssr: false,
});

export function BoardPage() {
  return (
    <DotBackground className="flex items-center justify-center">
      <BoardCanvas />
    </DotBackground>
  );
}
