'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/common/Modal';

import { useBoardPageState } from './model/use-board-page-state';
import { BoardHeader } from './ui/BoardHeader';
import { BoardToolbar, type ToolbarMode } from './ui/BoardToolbar';
import { DrawingColorPalette } from './ui/DrawingColorPalette';
import { DrawingHeader } from './ui/DrawingHeader';
import { DRAW_STROKE_WIDTH_MIN, DrawingSizeSlider } from './ui/DrawingSizeSlider';

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
    isInitialUploadModalOpen,
    setIsInitialUploadModalOpen,
    openPhotoSelect,
  } = useBoardPageState();
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('default');
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(DRAW_STROKE_WIDTH_MIN);

  return (
    <>
      <div className="relative mx-auto h-dvh w-full max-w-107.5 overflow-hidden">
        {toolbarMode === 'draw' ? (
          <DrawingHeader
            canUndo={false}
            onUndo={() => {}}
            onConfirm={() => setToolbarMode('default')}
          />
        ) : (
          <BoardHeader />
        )}
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
        <BoardContent
          boardId={boardId}
          isLoading={isBoardListLoading}
          mode={toolbarMode}
          drawColor={drawColor}
          drawStrokeWidth={drawStrokeWidth}
        />
        {toolbarMode === 'draw' && (
          <DrawingSizeSlider
            strokeWidth={drawStrokeWidth}
            onStrokeWidthChange={setDrawStrokeWidth}
          />
        )}
        <BoardToolbar
          mode={toolbarMode}
          onModeChange={setToolbarMode}
          onAddSticker={openPhotoSelect}
          aboveModeSwitcher={
            toolbarMode === 'draw' ? (
              <DrawingColorPalette color={drawColor} onColorChange={setDrawColor} />
            ) : undefined
          }
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
  drawColor,
  drawStrokeWidth,
}: {
  boardId?: string;
  isLoading: boolean;
  mode: ToolbarMode;
  drawColor: string;
  drawStrokeWidth: number;
}) {
  if (boardId) {
    return (
      <BoardCanvas
        boardId={boardId}
        mode={mode}
        drawColor={drawColor}
        drawStrokeWidth={drawStrokeWidth}
      />
    );
  }

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
