'use client';

import { Logo } from '@ppotto/assets';

import { cn } from '@/shared/lib/cn';

export function BoardInvitationNotFoundPage() {
  return (
    <main
      className={cn(
        'mx-auto flex h-dvh w-full max-w-107.5 flex-col overflow-hidden',
        'bg-black px-6 pt-16 pb-8',
      )}
    >
      <Logo width={104.23} height={32} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-body-01 text-white">초대를 찾을 수 없어요</h1>
        <p className="text-caption-01 text-gray-500">
          초대가 만료되었거나 보드가 삭제되었을 수 있어요
        </p>
      </div>
    </main>
  );
}
