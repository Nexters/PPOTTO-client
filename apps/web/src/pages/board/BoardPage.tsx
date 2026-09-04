'use client';

import { toCanvas } from 'html-to-image';
import dynamic from 'next/dynamic';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { bridge } from '@/shared/lib/bridge';
import { useKeyboardHeight } from '@/shared/lib/use-keyboard-height';

import { type EyedropperPixels, readCanvasPixels, sampleColorAt } from './model/eyedropper';
import { useBoardPageState } from './model/use-board-page-state';
import { useTermsGate } from './model/use-terms-gate';
import { BoardHeader } from './ui/BoardHeader';
import type { BoardCanvasHandle } from './ui/BoardCanvas';
import { BoardSizeSlider } from './ui/BoardSizeSlider';
import { BoardToolbar, type ToolbarMode } from './ui/BoardToolbar';
import { ConfirmCancelHeader } from './ui/ConfirmCancelHeader';
import { DrawingColorPalette } from './ui/DrawingColorPalette';
import { DrawingDeleteBar } from './ui/DrawingDeleteBar';
import { DrawingHeader } from './ui/DrawingHeader';
import { DrawingSizePreview } from './ui/DrawingSizePreview';
import { EyedropperMarker } from './ui/EyedropperMarker';
import { captureBoardTextLayout } from './ui/board-text-layout';
import { TextInputOverlay } from './ui/TextInputOverlay';

const BoardCanvas = dynamic(() => import('./ui/BoardCanvas').then((mod) => mod.BoardCanvas), {
  ssr: false,
});

const DRAW_STROKE_WIDTH_MIN = 2;
const DRAW_STROKE_WIDTH_MAX = 16;
const DRAW_STROKE_WIDTH_DEFAULT = (DRAW_STROKE_WIDTH_MIN + DRAW_STROKE_WIDTH_MAX) / 2;

const TEXT_FONT_SIZE_MIN = 12;
const TEXT_FONT_SIZE_MAX = 40;
const TEXT_FONT_SIZE_DEFAULT = (TEXT_FONT_SIZE_MIN + TEXT_FONT_SIZE_MAX) / 2;
const TEXT_MODE_HEADER_HEIGHT =
  'calc(var(--rn-safe-area-inset-top, env(safe-area-inset-top)) + 52px)';

const DEFAULT_EYEDROPPER_COLOR = '#ffffff';
const BOARD_BACKGROUND_COLOR = '#000';
const EYEDROPPER_SAMPLE_OFFSET_Y = 10;
const EYEDROPPER_CAPTURE_DELAY_MS = 250;

const captureBoard = (element: HTMLElement) =>
  toCanvas(element, { includeQueryParams: true, skipFonts: true, pixelRatio: 1 });

export function BoardPage() {
  useTermsGate();
  const { boardId, isBoardListLoading, openPhotoSelect } = useBoardPageState();
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('default');
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawStrokeWidth, setDrawStrokeWidth] = useState(DRAW_STROKE_WIDTH_DEFAULT);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [isAdjustingStrokeWidth, setIsAdjustingStrokeWidth] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [textFontSize, setTextFontSize] = useState(TEXT_FONT_SIZE_DEFAULT);
  const keyboardHeight = useKeyboardHeight(toolbarMode === 'text');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [cameraScale, setCameraScale] = useState(1);
  const [isDrawingDeleteArmed, setIsDrawingDeleteArmed] = useState(false);
  const [isDrawingOverTrash, setIsDrawingOverTrash] = useState(false);
  const isDrawingUiHidden =
    (toolbarMode === 'draw' && isDrawingActive) ||
    ((toolbarMode === 'move' || toolbarMode === 'default') && isDrawingDeleteArmed);
  const isBottomBarVisible =
    !isDrawingUiHidden ||
    ((toolbarMode === 'move' || toolbarMode === 'default') && isDrawingDeleteArmed);
  const canvasRef = useRef<BoardCanvasHandle>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const capturedPixelsRef = useRef<EyedropperPixels | null>(null);
  const captureBoundsRef = useRef<DOMRect | null>(null);
  const previewColorRef = useRef<string | null>(null);
  const pickerMarkerRef = useRef<HTMLDivElement>(null);
  const pickerFrameRef = useRef<number | null>(null);
  const pickerSessionRef = useRef(0);
  const snapshotVersionRef = useRef(0);
  const snapshotTaskRef = useRef<{
    version: number;
    promise: Promise<boolean>;
  } | null>(null);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolbarModeRef = useRef<ToolbarMode>('default');
  const trashButtonRef = useRef<HTMLButtonElement>(null);
  const setTextInputNode = useCallback((node: HTMLTextAreaElement | null) => {
    textInputRef.current = node;
  }, []);

  const [isPickingColor, setIsPickingColor] = useState(false);
  const [isPreparingColor, setIsPreparingColor] = useState(false);
  const [pickerInitialPosition, setPickerInitialPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [eyedropperColor, setEyedropperColor] = useState(DEFAULT_EYEDROPPER_COLOR);
  const [colorSource, setColorSource] = useState<'palette' | 'eyedropper'>('palette');
  const pickerPositionRef = useRef<{ x: number; y: number } | null>(null);

  const isEyedropperActive = isPreparingColor || isPickingColor || colorSource === 'eyedropper';

  const invalidateEyedropperSnapshot = useCallback(() => {
    snapshotVersionRef.current += 1;
    capturedPixelsRef.current = null;
    captureBoundsRef.current = null;
  }, []);

  const prepareEyedropperSnapshot = useCallback(async (): Promise<boolean> => {
    while (true) {
      if (capturedPixelsRef.current && captureBoundsRef.current) return true;

      const version = snapshotVersionRef.current;
      const activeTask = snapshotTaskRef.current;
      if (activeTask) {
        if (activeTask.version === version) return activeTask.promise;
        await activeTask.promise;
        continue;
      }

      const element = canvasRef.current?.getViewportElement();
      if (!element) return false;

      const work = (async () => {
        try {
          // 첫 캡처로 canvas 기반 스티커를 워밍업하고 두 번째 결과를 실제 픽셀로 사용한다.
          await captureBoard(element);
          if (snapshotVersionRef.current !== version) return false;

          const canvas = await captureBoard(element);
          if (snapshotVersionRef.current !== version) return false;

          const pixels = readCanvasPixels(canvas);
          if (!pixels) return false;
          capturedPixelsRef.current = pixels;
          captureBoundsRef.current = element.getBoundingClientRect();
          return true;
        } catch (error) {
          console.error('[eyedropper] 보드 캡처 실패', error);
          return false;
        }
      })();

      const promise = work.finally(() => {
        if (snapshotTaskRef.current?.promise === promise) snapshotTaskRef.current = null;
      });
      snapshotTaskRef.current = { version, promise };
      return promise;
    }
  }, []);

  const scheduleEyedropperSnapshot = useCallback(() => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    if (toolbarModeRef.current !== 'draw') return;
    snapshotTimerRef.current = setTimeout(() => {
      snapshotTimerRef.current = null;
      void prepareEyedropperSnapshot();
    }, EYEDROPPER_CAPTURE_DELAY_MS);
  }, [prepareEyedropperSnapshot]);

  const handleBoardVisualChange = useCallback(() => {
    invalidateEyedropperSnapshot();
    scheduleEyedropperSnapshot();
  }, [invalidateEyedropperSnapshot, scheduleEyedropperSnapshot]);

  // 드래그 중에는 React 상태를 바꾸지 않고 마커 DOM과 미리 읽어둔 픽셀만 갱신한다.
  const sampleAtClientPoint = useCallback((clientX: number, clientY: number) => {
    pickerPositionRef.current = { x: clientX, y: clientY };
    const marker = pickerMarkerRef.current;
    if (marker) {
      marker.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -100%)`;
    }

    const pixels = capturedPixelsRef.current;
    const bounds = captureBoundsRef.current;
    if (!pixels || !bounds) return;

    const x = ((clientX - bounds.left) / bounds.width) * pixels.width;
    const y = ((clientY - EYEDROPPER_SAMPLE_OFFSET_Y - bounds.top) / bounds.height) * pixels.height;
    const color = sampleColorAt(pixels, x, y);
    previewColorRef.current = color;
    if (marker) marker.style.color = color;
  }, []);

  const scheduleSampleAtClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      pickerPositionRef.current = { x: clientX, y: clientY };
      if (pickerFrameRef.current !== null) return;
      pickerFrameRef.current = requestAnimationFrame(() => {
        pickerFrameRef.current = null;
        const point = pickerPositionRef.current;
        if (point) sampleAtClientPoint(point.x, point.y);
      });
    },
    [sampleAtClientPoint],
  );

  const startPicking = async () => {
    if (isPreparingColor || isPickingColor) return;
    const session = ++pickerSessionRef.current;
    previewColorRef.current = null;
    setIsPreparingColor(true);

    const isReady = await prepareEyedropperSnapshot();
    if (pickerSessionRef.current !== session) return;
    setIsPreparingColor(false);
    if (!isReady || !captureBoundsRef.current) return;

    const bounds = captureBoundsRef.current;
    const initialPosition = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
    pickerPositionRef.current = initialPosition;
    setPickerInitialPosition(initialPosition);
    setIsPickingColor(true);
  };

  useEffect(() => {
    if (!isPickingColor) return;

    const initialPosition = pickerPositionRef.current;
    if (initialPosition) sampleAtClientPoint(initialPosition.x, initialPosition.y);

    const updatePosition = (e: PointerEvent) => scheduleSampleAtClientPoint(e.clientX, e.clientY);

    const stopPicking = (e: PointerEvent) => {
      if (pickerFrameRef.current !== null) {
        cancelAnimationFrame(pickerFrameRef.current);
        pickerFrameRef.current = null;
      }
      sampleAtClientPoint(e.clientX, e.clientY);
      pickerSessionRef.current += 1;
      setIsPickingColor(false);
      setPickerInitialPosition(null);
      pickerPositionRef.current = null;

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
    window.addEventListener('pointercancel', stopPicking);
    return () => {
      window.removeEventListener('pointermove', updatePosition);
      window.removeEventListener('pointerup', stopPicking);
      window.removeEventListener('pointercancel', stopPicking);
      if (pickerFrameRef.current !== null) {
        cancelAnimationFrame(pickerFrameRef.current);
        pickerFrameRef.current = null;
      }
    };
  }, [isPickingColor, sampleAtClientPoint, scheduleSampleAtClientPoint]);

  const changeToolbarMode = (nextMode: ToolbarMode) => {
    toolbarModeRef.current = nextMode;
    if (nextMode !== 'draw') {
      if (snapshotTimerRef.current) {
        clearTimeout(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
      }
      invalidateEyedropperSnapshot();
      setColorSource('palette');
      setEyedropperColor(DEFAULT_EYEDROPPER_COLOR);
      pickerSessionRef.current += 1;
      setIsPreparingColor(false);
      setIsPickingColor(false);
      setPickerInitialPosition(null);
      pickerPositionRef.current = null;
      previewColorRef.current = null;
      setIsAdjustingStrokeWidth(false);
    } else {
      scheduleEyedropperSnapshot();
    }
    setToolbarMode(nextMode);
  };

  useEffect(
    () => () => {
      pickerSessionRef.current += 1;
      snapshotVersionRef.current += 1;
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    },
    [],
  );

  const handleToolbarModeChange = (next: ToolbarMode) => {
    if (next === 'text') {
      flushSync(() => changeToolbarMode(next));
      return;
    }
    changeToolbarMode(next);
  };

  const finishTextMode = () => {
    if (textDraft.trim()) {
      const textInput = textInputRef.current;
      if (textInput) {
        const renderedText = captureBoardTextLayout(textInput, textDraft);
        canvasRef.current?.createText(renderedText, textFontSize, textInput.clientWidth);
      }
    }
    setTextDraft('');
    setToolbarMode('default');
  };

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
        className="relative mx-auto h-dvh w-full max-w-107.5 overflow-hidden"
        style={{
          backgroundColor: BOARD_BACKGROUND_COLOR,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-60"
          style={{
            height: 'var(--rn-safe-area-inset-top, env(safe-area-inset-top))',
            backgroundColor: BOARD_BACKGROUND_COLOR,
          }}
        />
        {!isBottomBarVisible && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-60"
            style={{
              height: 'var(--rn-safe-area-inset-bottom, env(safe-area-inset-bottom))',
              backgroundColor: BOARD_BACKGROUND_COLOR,
            }}
          />
        )}
        {!isDrawingUiHidden &&
          (toolbarMode === 'draw' ? (
            <DrawingHeader
              canUndo={canUndo}
              onUndo={() => canvasRef.current?.undoLastStroke()}
              canRedo={canRedo}
              onRedo={() => canvasRef.current?.redoLastStroke()}
              onConfirm={() => changeToolbarMode('default')}
            />
          ) : toolbarMode === 'move' ? (
            <ConfirmCancelHeader
              onCancel={() => {
                canvasRef.current?.cancelMoveSession();
                changeToolbarMode('default');
              }}
              onConfirm={() => changeToolbarMode('default')}
            />
          ) : toolbarMode === 'text' ? (
            <ConfirmCancelHeader
              onCancel={() => {
                setTextDraft('');
                setToolbarMode('default');
              }}
              onConfirm={finishTextMode}
            />
          ) : (
            <BoardHeader onRecenter={() => canvasRef.current?.recenterCamera()} />
          ))}
        <BoardContent
          boardId={boardId}
          isLoading={isBoardListLoading}
          mode={toolbarMode}
          drawColor={drawColor}
          drawStrokeWidth={drawStrokeWidth}
          isPointerInputSuspended={isPreparingColor || isPickingColor || toolbarMode === 'text'}
          onDrawingActiveChange={setIsDrawingActive}
          onCanUndoChange={setCanUndo}
          onCanRedoChange={setCanRedo}
          onCameraScaleChange={setCameraScale}
          onVisualChange={handleBoardVisualChange}
          onDrawingDeleteArmedChange={setIsDrawingDeleteArmed}
          onDrawingDragOverTrashChange={setIsDrawingOverTrash}
          canvasRef={canvasRef}
          trashButtonRef={trashButtonRef}
        />
        {toolbarMode === 'draw' && !isDrawingUiHidden && (
          <BoardSizeSlider
            value={drawStrokeWidth}
            min={DRAW_STROKE_WIDTH_MIN}
            max={DRAW_STROKE_WIDTH_MAX}
            onChange={setDrawStrokeWidth}
            onDraggingChange={setIsAdjustingStrokeWidth}
          />
        )}
        {isAdjustingStrokeWidth && (
          <div className="pointer-events-none fixed top-1/2 left-1/2 z-70 -translate-x-1/2 -translate-y-1/2">
            <DrawingSizePreview strokeWidth={drawStrokeWidth * cameraScale} />
          </div>
        )}
        {toolbarMode === 'text' && (
          <div
            className="modal-overlay fixed inset-0 z-50 bg-black/1 backdrop-blur-[30px]"
            onPointerDown={(event) => {
              if (event.target !== event.currentTarget) return;
              finishTextMode();
            }}
          />
        )}
        {toolbarMode === 'text' && (
          <div
            className="pointer-events-none fixed inset-x-0 z-55 transition-[bottom] duration-300 ease-out"
            style={{ top: TEXT_MODE_HEADER_HEIGHT, bottom: keyboardHeight }}
          >
            <TextInputOverlay
              value={textDraft}
              onChange={setTextDraft}
              fontSize={textFontSize}
              onNodeChange={setTextInputNode}
            />
            <BoardSizeSlider
              value={textFontSize}
              min={TEXT_FONT_SIZE_MIN}
              max={TEXT_FONT_SIZE_MAX}
              onChange={setTextFontSize}
            />
          </div>
        )}
        {!isDrawingUiHidden && toolbarMode !== 'text' && (
          <BoardToolbar
            mode={toolbarMode}
            onModeChange={handleToolbarModeChange}
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
                  onEyedropperStart={() => void startPicking()}
                />
              ) : undefined
            }
          />
        )}
        {(toolbarMode === 'move' || toolbarMode === 'default') && isDrawingDeleteArmed && (
          <DrawingDeleteBar trashButtonRef={trashButtonRef} isDragOver={isDrawingOverTrash} />
        )}
      </div>
      {isPickingColor && pickerInitialPosition && (
        <div
          ref={pickerMarkerRef}
          className="pointer-events-none fixed top-0 left-0 z-70"
          style={{
            color: BOARD_BACKGROUND_COLOR,
            transform: `translate3d(${pickerInitialPosition.x}px, ${pickerInitialPosition.y}px, 0) translate(-50%, -100%)`,
          }}
        >
          <EyedropperMarker />
        </div>
      )}
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
  onVisualChange,
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
  onVisualChange: () => void;
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
        onVisualChange={onVisualChange}
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
