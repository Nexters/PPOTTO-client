'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { bridge } from '@/shared/lib/bridge';
import { Modal } from '@/shared/ui/common/Modal';

import { useBoardPageState } from './model/use-board-page-state';
import { BoardHeader } from './ui/BoardHeader';
import { BoardToolbar, type ToolbarMode } from './ui/BoardToolbar';

const BoardCanvas = dynamic(() => import('./ui/BoardCanvas').then((mod) => mod.BoardCanvas), {
  ssr: false,
});

export function BoardPage() {
  const {
    boardId,
    canDeleteStickers,
    deleteAllStickers,
    isDeletingStickers,
    isBoardListLoading,
    isBoardLoading,
    isInitialUploadModalOpen,
    setIsInitialUploadModalOpen,
    openPhotoSelect,
  } = useBoardPageState();
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('default');

  useEffect(() => {
    if (isBoardListLoading || (boardId && isBoardLoading)) return;

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => bridge.send('BOARD_READY'));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [boardId, isBoardListLoading, isBoardLoading]);

  return (
    <>
      <div
        className="relative mx-auto h-dvh w-full max-w-107.5 overflow-hidden"
        style={{
          backgroundColor: '#000',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <BoardHeader />
        <button
          type="button"
          disabled={!canDeleteStickers || isDeletingStickers}
          onClick={deleteAllStickers}
          className={cn(
            'absolute top-28 left-6 z-20 rounded-lg',
            'bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40',
          )}
        >
          {isDeletingStickers ? '삭제 중...' : '스티커 전체 삭제 (DEBUG)'}
        </button>
        <BoardContent boardId={boardId} isLoading={isBoardListLoading} mode={toolbarMode} />
        <BoardToolbar
          mode={toolbarMode}
          onModeChange={setToolbarMode}
          onAddSticker={openPhotoSelect}
        />
      </div>
      <Modal
        open={isInitialUploadModalOpen}
        onOpenChange={setIsInitialUploadModalOpen}
        title="묵은 사진 대방출!"
        description="아직 사진을 올린 적이 없어요. 사진을 올리러 가볼까요?"
      >
        <Modal.Cancel>취소</Modal.Cancel>
        <Modal.Confirm onClick={openPhotoSelect}>확인</Modal.Confirm>
      </Modal>
    </>
  );
}

function BoardContent({
  boardId,
  isLoading,
  mode,
}: {
  boardId?: string;
  isLoading: boolean;
  mode: ToolbarMode;
}) {
  if (boardId) return <BoardCanvas boardId={boardId} mode={mode} />;

  return (
    <BoardStatus>{isLoading ? '보드를 불러오는 중이에요' : '보드를 불러오지 못했어요'}</BoardStatus>
  );
}

function BoardStatus({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <p className="text-gray-400 text-body-04">{children}</p>
    </div>
  );
}
