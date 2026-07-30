'use client';

import dynamic from 'next/dynamic';

const BoardCanvas = dynamic(() => import('./ui/BoardCanvas').then((mod) => mod.BoardCanvas), {
  ssr: false,
});

export function BoardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <BoardCanvas />
    </main>
  );
}
