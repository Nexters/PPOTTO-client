'use client';

import { IconPlus, IconSettings, Logo } from '@ppotto/assets';
import { useFlow } from '@stackflow/react';
import { useEffect, useId, useState } from 'react';

import { useBoardSummaryListQuery } from '@/entities/board/api/board-queries';
import { bridge } from '@/shared/lib/bridge';
import { cn } from '@/shared/lib/cn';
import { shouldShowLoadError } from '@/shared/lib/should-show-load-error';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';
import { Button, IconButton } from '@/shared/ui/common/Button';
import { Skeleton } from '@/shared/ui/Skeleton';

import {
  BOARD_HOME_TABS,
  type BoardHomeTab,
  countBoardsInTab,
  filterBoardsByTab,
} from './model/board-home-tab';
import { useTermsGate } from './model/use-terms-gate';
import { BoardCard } from './ui/BoardCard';
import { BoardMenuSheet } from './ui/BoardMenuSheet';

const SAFE_AREA_TOP = 'var(--rn-safe-area-inset-top, env(safe-area-inset-top))';

export function HomePage() {
  useTermsGate();
  const { push } = useFlow();
  const { data, isPending, isError, refetch, isStale, dataUpdatedAt } = useBoardSummaryListQuery();
  const [tab, setTab] = useState<BoardHomeTab>('ALL');
  const [menuBoardId, setMenuBoardId] = useState<string | null>(null);
  const boards = data ? filterBoardsByTab(data.boards, tab) : [];
  const closeMenu = () => setMenuBoardId(null);
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const tabId = (target: BoardHomeTab) => `${baseId}-tab-${target}`;

  useRefetchOnActive(refetch, isStale);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => bridge.send('BOARD_READY'));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);

  return (
    <main className="relative mx-auto h-dvh w-full max-w-107.5 overflow-hidden bg-black">
      <div
        className="h-full overflow-y-auto px-6 pb-40"
        style={{ paddingTop: `calc(${SAFE_AREA_TOP} + 148px)` }}
      >
        <div role="tabpanel" id={panelId} aria-labelledby={tabId(tab)}>
          {isPending ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-33 w-full rounded-24" />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {boards.map((board) => (
                <li key={board.id} className="flex">
                  <BoardCard
                    board={board}
                    now={dataUpdatedAt}
                    isMenuTarget={board.id === menuBoardId}
                    onOpen={() => push('Board', { boardId: board.id })}
                    onOpenMenu={board.role === 'OWNER' ? () => setMenuBoardId(board.id) : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
          {data && boards.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-body-04 text-gray-400">아직 보드가 없어요</p>
            </div>
          )}
        </div>
      </div>

      {shouldShowLoadError(isError, data) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <p className="text-body-04 text-gray-400">보드를 불러오지 못했어요</p>
          <Button size="medium" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      )}

      <header
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0',
          'flex flex-col gap-8 px-6 pb-3',
        )}
        style={{
          paddingTop: `calc(${SAFE_AREA_TOP} + 20px)`,
          backgroundImage: 'linear-gradient(to bottom, #000 54%, transparent)',
        }}
      >
        <div className="flex items-center justify-between">
          <Logo width={105} height={32} />
          <button
            type="button"
            aria-label="설정"
            onClick={() => push('Settings', {})}
            className="pointer-events-auto"
          >
            <IconSettings color="white" />
          </button>
        </div>
        <div role="tablist" className="pointer-events-auto flex gap-2">
          {BOARD_HOME_TABS.map((item) => {
            const isSelected = item.tab === tab;
            const count = data && countBoardsInTab(data.counts, item.tab);
            return (
              <button
                key={item.tab}
                id={tabId(item.tab)}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={panelId}
                aria-label={data ? `${item.label} ${count}` : item.label}
                onClick={() => setTab(item.tab)}
                className={cn(
                  'flex items-center gap-1 rounded-full px-4 py-2',
                  'shadow-[0_8px_20px_rgba(0,0,0,0.16)]',
                  isSelected ? 'bg-white text-body-05 text-black' : 'bg-gray-900 text-body-06',
                  !isSelected && 'text-gray-400',
                )}
              >
                {item.label}
                {data && <span>{count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0',
          'flex justify-end px-6 pt-16 pb-12',
        )}
        style={{ backgroundImage: 'linear-gradient(to top, #000, transparent)' }}
      >
        <IconButton aria-label="보드 추가" aria-disabled="true" className="pointer-events-auto">
          <IconPlus />
        </IconButton>
      </div>

      {menuBoardId && <div className="absolute inset-0 z-20 bg-black/50" />}
      <BoardMenuSheet
        isOpen={menuBoardId !== null}
        onClose={closeMenu}
        onRename={closeMenu}
        onDelete={closeMenu}
      />
    </main>
  );
}
