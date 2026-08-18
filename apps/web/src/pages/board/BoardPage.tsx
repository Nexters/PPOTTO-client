'use client';

import { toCanvas } from 'html-to-image';
import dynamic from 'next/dynamic';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { bridge } from '@/shared/lib/bridge';

import { sampleColorAt } from './model/eyedropper';
import { useBoardPageState } from './model/use-board-page-state';
import { useTermsGate } from './model/use-terms-gate';
import type { BoardCanvasHandle } from './ui/BoardCanvas';
import { BoardHeader } from './ui/BoardHeader';
import { BoardToolbar, type ToolbarMode } from './ui/BoardToolbar';
import { DrawingColorPalette } from './ui/DrawingColorPalette';
import { DrawingDeleteBar } from './ui/DrawingDeleteBar';
import { DrawingHeader } from './ui/DrawingHeader';
import { DRAW_STROKE_WIDTH_DEFAULT, DrawingSizeSlider } from './ui/DrawingSizeSlider';
import { DrawingSizePreview } from './ui/DrawingSizePreview';
import { EyedropperMarker } from './ui/EyedropperMarker';
import { MoveHeader } from './ui/MoveHeader';

const BoardCanvas = dynamic(() => import('./ui/BoardCanvas').then((mod) => mod.BoardCanvas), {
  ssr: false,
});

const DEFAULT_EYEDROPPER_COLOR = '#ffffff';
const BOARD_BACKGROUND_COLOR = '#000';

export function BoardPage() {
  useTermsGate();
  const { boardId, isBoardListLoading, openPhotoSelect } = useBoardPageState();
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('default');
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(DRAW_STROKE_WIDTH_DEFAULT);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [isAdjustingStrokeWidth, setIsAdjustingStrokeWidth] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [cameraScale, setCameraScale] = useState(1);
  const [isDrawingDeleteArmed, setIsDrawingDeleteArmed] = useState(false);
  const [isDrawingOverTrash, setIsDrawingOverTrash] = useState(false);
  const isDrawingUiHidden =
    (toolbarMode === 'draw' && isDrawingActive) ||
    ((toolbarMode === 'move' || toolbarMode === 'default') && isDrawingDeleteArmed);
  const canvasRef = useRef<BoardCanvasHandle>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLCanvasElement | null>(null);
  const previewColorRef = useRef<string | null>(null);
  const trashButtonRef = useRef<HTMLButtonElement>(null);

  const [isPickingColor, setIsPickingColor] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [eyedropperColor, setEyedropperColor] = useState(DEFAULT_EYEDROPPER_COLOR);
  const [colorSource, setColorSource] = useState<'palette' | 'eyedropper'>('palette');
  const pickerPositionRef = useRef<{ x: number; y: number } | null>(null);

  const isEyedropperActive = isPickingColor || colorSource === 'eyedropper';
  const isEyedropperColorApplied = colorSource === 'eyedropper';

  const captureBoard = (element: HTMLElement) =>
    toCanvas(element, { includeQueryParams: true, skipFonts: true, pixelRatio: 1 });

  // 화면 좌표 위치의 마커를 그리고, 그 지점의 캡처된 픽셀 색을 미리보기로 반영한다
  const sampleAtClientPoint = (clientX: number, clientY: number) => {
    pickerPositionRef.current = { x: clientX, y: clientY };
    setPickerPosition({ x: clientX, y: clientY });

    const canvas = captureRef.current;
    const rect = pageRef.current?.getBoundingClientRect();
    if (!canvas || !rect) return;
    const color = sampleColorAt(canvas, clientX - rect.left, clientY - rect.top);
    if (color) {
      previewColorRef.current = color;
      setPreviewColor(color);
    }
  };

  const startPicking = async () => {
    if (!pageRef.current) return;
    const element = pageRef.current;
    const rect = element.getBoundingClientRect();

    setIsPickingColor(true);
    sampleAtClientPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);

    try {
      // 첫 캡처는 워밍업으로 버리고 두 번째 결과를 쓴다
      await captureBoard(element);
      captureRef.current = await captureBoard(element);
      // 캡처가 끝난 시점의 최신 포인터 위치로 색을 다시 계산한다
      const latestPosition = pickerPositionRef.current;
      if (latestPosition) {
        sampleAtClientPoint(latestPosition.x, latestPosition.y);
      }
    } catch (error) {
      console.error('[eyedropper] 보드 캡처 실패', error);
    }
  };

  useEffect(() => {
    if (!isPickingColor) return;

    const updatePosition = (e: PointerEvent) => sampleAtClientPoint(e.clientX, e.clientY);

    const stopPicking = () => {
      setIsPickingColor(false);
      setPickerPosition(null);
      pickerPositionRef.current = null;
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

  // 드로잉 모드를 나가면 스포이드 선택 상태를 초기화한다
  const [prevToolbarMode, setPrevToolbarMode] = useState(toolbarMode);
  if (toolbarMode !== prevToolbarMode) {
    setPrevToolbarMode(toolbarMode);
    if (toolbarMode !== 'draw') {
      setColorSource('palette');
      setEyedropperColor(DEFAULT_EYEDROPPER_COLOR);
      setIsPickingColor(false);
      setPickerPosition(null);
      setPreviewColor(null);
      setIsAdjustingStrokeWidth(false);
    }
  }

  useEffect(() => {
    if (toolbarMode === 'draw') return;
    captureRef.current = null;
    previewColorRef.current = null;
  }, [toolbarMode]);

  // 헤더·툴바·배경은 보드 데이터와 무관하게 이미 그려져 있다. 스티커를 기다리지 않고
  // 셸이 페인트되는 즉시 커버를 걷는다 — 스티커는 그 뒤에 채워진다
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
    <>
      <div
        ref={pageRef}
        className="relative mx-auto h-dvh w-full max-w-107.5 overflow-hidden"
        style={{
          backgroundColor: BOARD_BACKGROUND_COLOR,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        {!isDrawingUiHidden &&
          (toolbarMode === 'draw' ? (
            <DrawingHeader
              canUndo={canUndo}
              onUndo={() => canvasRef.current?.undoLastStroke()}
              canRedo={canRedo}
              onRedo={() => canvasRef.current?.redoLastStroke()}
              onConfirm={() => setToolbarMode('default')}
            />
          ) : toolbarMode === 'move' ? (
            <MoveHeader
              onCancel={() => {
                canvasRef.current?.cancelMoveSession();
                setToolbarMode('default');
              }}
              onConfirm={() => setToolbarMode('default')}
            />
          ) : (
            <BoardHeader />
          ))}
        <BoardContent
          boardId={boardId}
          isLoading={isBoardListLoading}
          mode={toolbarMode}
          drawColor={drawColor}
          drawStrokeWidth={drawStrokeWidth}
          isPointerInputSuspended={isPickingColor}
          onDrawingActiveChange={setIsDrawingActive}
          onCanUndoChange={setCanUndo}
          onCanRedoChange={setCanRedo}
          onCameraScaleChange={setCameraScale}
          onDrawingDeleteArmedChange={setIsDrawingDeleteArmed}
          onDrawingDragOverTrashChange={setIsDrawingOverTrash}
          canvasRef={canvasRef}
          trashButtonRef={trashButtonRef}
        />
        {toolbarMode === 'draw' && !isDrawingUiHidden && (
          <DrawingSizeSlider
            strokeWidth={drawStrokeWidth}
            onStrokeWidthChange={setDrawStrokeWidth}
            onDraggingChange={setIsAdjustingStrokeWidth}
          />
        )}
        {isAdjustingStrokeWidth && (
          <div className="pointer-events-none fixed top-1/2 left-1/2 z-70 -translate-x-1/2 -translate-y-1/2">
            <DrawingSizePreview strokeWidth={drawStrokeWidth * cameraScale} />
          </div>
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
        {(toolbarMode === 'move' || toolbarMode === 'default') && isDrawingDeleteArmed && (
          <DrawingDeleteBar trashButtonRef={trashButtonRef} isDragOver={isDrawingOverTrash} />
        )}
        {pickerPosition && (
          <div
            className="pointer-events-none fixed z-70 -translate-x-1/2 -translate-y-full"
            style={{ left: pickerPosition.x, top: pickerPosition.y }}
          >
            <EyedropperMarker color={previewColor ?? BOARD_BACKGROUND_COLOR} />
          </div>
        )}
      </div>
    </>
  );
}

function BoardContent({
  boardId,
  isLoading,
  mode,
  drawColor,
  drawStrokeWidth,
  isPointerInputSuspended,
  onDrawingActiveChange,
  onCanUndoChange,
  onCanRedoChange,
  onCameraScaleChange,
  onDrawingDeleteArmedChange,
  onDrawingDragOverTrashChange,
  canvasRef,
  trashButtonRef,
}: {
  boardId?: string;
  isLoading: boolean;
  mode: ToolbarMode;
  drawColor: string;
  drawStrokeWidth: number;
  isPointerInputSuspended: boolean;
  onDrawingActiveChange: (active: boolean) => void;
  onCanUndoChange: (canUndo: boolean) => void;
  onCanRedoChange: (canRedo: boolean) => void;
  onCameraScaleChange: (scale: number) => void;
  onDrawingDeleteArmedChange: (isArmed: boolean) => void;
  onDrawingDragOverTrashChange: (isOver: boolean) => void;
  canvasRef: RefObject<BoardCanvasHandle | null>;
  trashButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  if (boardId) {
    return (
      <BoardCanvas
        ref={canvasRef}
        boardId={boardId}
        mode={mode}
        drawColor={drawColor}
        drawStrokeWidth={drawStrokeWidth}
        isPointerInputSuspended={isPointerInputSuspended}
        onDrawingActiveChange={onDrawingActiveChange}
        onCanUndoChange={onCanUndoChange}
        onCanRedoChange={onCanRedoChange}
        onCameraScaleChange={onCameraScaleChange}
        onDrawingDeleteArmedChange={onDrawingDeleteArmedChange}
        onDrawingDragOverTrashChange={onDrawingDragOverTrashChange}
        trashButtonRef={trashButtonRef}
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
