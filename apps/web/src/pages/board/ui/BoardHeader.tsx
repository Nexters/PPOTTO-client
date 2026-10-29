'use client';

import { ChevronLeft, MenuKebab } from '@ppotto/assets';

type BoardHeaderProps = {
  title?: string;
  participantCount?: number;
  onBack: () => void;
  onOpenMenu: () => void;
  onTitleClick?: () => void;
};

export function BoardHeader({
  title,
  participantCount,
  onBack,
  onOpenMenu,
  onTitleClick,
}: BoardHeaderProps) {
  return (
    <header
      className="pointer-events-none absolute inset-x-0 z-60 px-6 pt-3 pb-16"
      style={{
        top: 'var(--rn-safe-area-inset-top, env(safe-area-inset-top))',
        backgroundImage: 'linear-gradient(to bottom, black 29px, transparent)',
      }}
    >
      <div className="grid h-10 w-full grid-cols-[40px_minmax(0,1fr)_40px] items-center">
        <button
          type="button"
          aria-label="뒤로가기"
          onClick={onBack}
          className="pointer-events-auto flex size-10 items-center justify-start"
        >
          <ChevronLeft />
        </button>

        <div className="flex min-w-0 items-center justify-center gap-2 text-body-01">
          <button
            type="button"
            aria-label="보드 가운데로 보기"
            onClick={onTitleClick}
            className="pointer-events-auto min-w-0"
          >
            <h1 className="truncate text-white">{title ?? ''}</h1>
          </button>
          {participantCount !== undefined && (
            <span aria-label={`참여자 ${participantCount}명`} className="shrink-0 text-gray-500">
              {participantCount}
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label="보드 메뉴 열기"
          onClick={onOpenMenu}
          className="pointer-events-auto flex size-10 items-center justify-end"
        >
          <MenuKebab color="white" />
        </button>
      </div>
    </header>
  );
}
