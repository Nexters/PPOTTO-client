'use client';

import { toCanvas } from 'html-to-image';
import dynamic from 'next/dynamic';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/common/Modal';

import { sampleColorAt } from './model/eyedropper';
import { useBoardPageState } from './model/use-board-page-state';
import type { BoardCanvasHandle } from './ui/BoardCanvas';
import { BoardHeader } from './ui/BoardHeader';
import { BoardToolbar, type ToolbarMode } from './ui/BoardToolbar';
import { DrawingColorPalette } from './ui/DrawingColorPalette';
import { DrawingHeader } from './ui/DrawingHeader';
import { DRAW_STROKE_WIDTH_MIN, DrawingSizeSlider } from './ui/DrawingSizeSlider';
import { EyedropperMarker } from './ui/EyedropperMarker';

const BoardCanvas = dynamic(() => import('./ui/BoardCanvas').then((mod) => mod.BoardCanvas), {
  ssr: false,
});

// 스포이드로 아직 색을 고른 적 없거나, 팔레트 색을 다시 선택해 스포이드 선택이 풀렸을 때의 기본값
const DEFAULT_EYEDROPPER_COLOR = '#ffffff';

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
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const isDrawingUiHidden = toolbarMode === 'draw' && isDrawingActive;
  const canvasRef = useRef<BoardCanvasHandle>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLCanvasElement | null>(null);
  const previewColorRef = useRef<string | null>(null);

  const [isPickingColor, setIsPickingColor] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [eyedropperColor, setEyedropperColor] = useState(DEFAULT_EYEDROPPER_COLOR);
  const [colorSource, setColorSource] = useState<'palette' | 'eyedropper'>('palette');

  const isEyedropperActive = isPickingColor || colorSource === 'eyedropper';
  const isEyedropperColorApplied = colorSource === 'eyedropper';

  const startPicking = async () => {
    if (!pageRef.current) return;
    // html-to-image로 그 시점의 보드 화면을 한 번 캡처한다
    try {
      captureRef.current = await toCanvas(pageRef.current, {
        includeQueryParams: true,
        skipFonts: true,
        pixelRatio: 1,
        onImageErrorHandler: (target) => {
          console.warn('[eyedropper] 이미지 임베드 실패, 건너뜀', target);
        },
      });
      setIsPickingColor(true);
    } catch (error) {
      console.error('[eyedropper] 보드 캡처 실패', error);
    }
  };

  useEffect(() => {
    if (!isPickingColor) return;

    const updatePosition = (e: PointerEvent) => {
      setPickerPosition({ x: e.clientX, y: e.clientY });

      const canvas = captureRef.current;
      const rect = pageRef.current?.getBoundingClientRect();
      if (!canvas || !rect) return;
      const color = sampleColorAt(canvas, e.clientX - rect.left, e.clientY - rect.top);
      if (color) {
        previewColorRef.current = color;
        setPreviewColor(color);
      }
    };

    const stopPicking = () => {
      setIsPickingColor(false);
      setPickerPosition(null);
      setPreviewColor(null);
      captureRef.current = null;

      const color = previewColorRef.current;
      previewColorRef.current = null;
      if (color) {
        setDrawColor(color);
        setEyedropperColor(color);
        setColorSource('eyedropper');
      }
    };

    window.addEventListener('pointermove', updatePosition);
    window.addEventListener('pointerup', stopPicking);
    return () => {
      window.removeEventListener('pointermove', updatePosition);
      window.removeEventListener('pointerup', stopPicking);
    };
  }, [isPickingColor]);

  return (
    <>
      <div ref={pageRef} className="relative mx-auto h-dvh w-full max-w-107.5 overflow-hidden">
        {!isDrawingUiHidden &&
          (toolbarMode === 'draw' ? (
            <DrawingHeader
              canUndo={canUndo}
              onUndo={() => canvasRef.current?.undoLastStroke()}
              onConfirm={() => setToolbarMode('default')}
            />
          ) : (
            <BoardHeader />
          ))}
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
          onDrawingActiveChange={setIsDrawingActive}
          onCanUndoChange={setCanUndo}
          canvasRef={canvasRef}
        />
        {toolbarMode === 'draw' && !isDrawingUiHidden && (
          <DrawingSizeSlider
            strokeWidth={drawStrokeWidth}
            onStrokeWidthChange={setDrawStrokeWidth}
          />
        )}
        {!isDrawingUiHidden && (
          <BoardToolbar
            mode={toolbarMode}
            onModeChange={setToolbarMode}
            onAddSticker={openPhotoSelect}
            aboveModeSwitcher={
              toolbarMode === 'draw' ? (
                <DrawingColorPalette
                  color={drawColor}
                  onColorChange={(next) => {
                    setDrawColor(next);
                    setColorSource('palette');
                    setEyedropperColor(DEFAULT_EYEDROPPER_COLOR);
                  }}
                  eyedropperColor={eyedropperColor}
                  isEyedropperActive={isEyedropperActive}
                  isEyedropperColorApplied={isEyedropperColorApplied}
                  onEyedropperStart={() => void startPicking()}
                />
              ) : undefined
            }
          />
        )}
        {pickerPosition && (
          <div
            className="pointer-events-none fixed z-70 -translate-x-1/2 -translate-y-full"
            style={{ left: pickerPosition.x, top: pickerPosition.y }}
          >
            <EyedropperMarker color={previewColor ?? drawColor} />
          </div>
        )}
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
  onDrawingActiveChange,
  onCanUndoChange,
  canvasRef,
}: {
  boardId?: string;
  isLoading: boolean;
  mode: ToolbarMode;
  drawColor: string;
  drawStrokeWidth: number;
  onDrawingActiveChange: (active: boolean) => void;
  onCanUndoChange: (canUndo: boolean) => void;
  canvasRef: RefObject<BoardCanvasHandle | null>;
}) {
  if (boardId) {
    return (
      <BoardCanvas
        ref={canvasRef}
        boardId={boardId}
        mode={mode}
        drawColor={drawColor}
        drawStrokeWidth={drawStrokeWidth}
        onDrawingActiveChange={onDrawingActiveChange}
        onCanUndoChange={onCanUndoChange}
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
