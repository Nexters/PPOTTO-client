'use client';

import { Logo } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

import { SharedBoardHeader } from './SharedBoardHeader';

// 없는 링크, 삭제된 보드, 공유자 탈퇴·나가기 (Figma 3356:18771)
export default function SharedBoardNotFound() {
  return (
    <main
      className="relative mx-auto h-dvh w-full max-w-112.5 overflow-hidden bg-black"
      style={{
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <div
        className={cn(
          'absolute inset-x-6 top-1/2 flex -translate-y-1/2 flex-col items-center',
          'gap-1 text-center',
        )}
      >
        <span className="text-body-03 text-white">보드를 찾을 수 없어요</span>
        <span className="text-body-06 text-gray-500">공유가 꺼졌거나 삭제된 보드예요</span>
      </div>
      <SharedBoardHeader>
        <Logo width={104} height={32} />
      </SharedBoardHeader>
    </main>
  );
}
