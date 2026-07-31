'use client';

import dynamic from 'next/dynamic';

import { DotBackground } from '@/shared/ui/DotBackground';

import { BoardHeader } from './ui/BoardHeader';
import { BoardToolbar } from './ui/BoardToolbar';

const BoardCanvas = dynamic(() => import('./ui/BoardCanvas').then((mod) => mod.BoardCanvas), {
  ssr: false,
});

export function BoardPage() {
  return (
    <DotBackground>
      <div className="relative mx-auto h-dvh w-full max-w-107.5 overflow-hidden">
        <BoardHeader />
        <BoardCanvas />
        <BoardToolbar />
      </div>
    </DotBackground>
  );
}
