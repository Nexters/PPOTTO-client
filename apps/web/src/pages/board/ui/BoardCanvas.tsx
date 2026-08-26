'use client';

import { useActivity, useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  forwardRef,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { useBoardQuery } from '@/entities/board/api/board-queries';
import { bridge } from '@/shared/lib/bridge';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';
import { uuidv7 } from '@/shared/lib/uuidv7';
import { useToast } from '@/shared/ui/common/Toast';

import { BOARD_ZOOM_MIN, DOT_FADE_START_ZOOM, toWorldPoint } from '../model/board-camera';
import {
  drawingZIndex,
  type ParsedDrawing,
  parseStrokePoints,
  parseStrokeZIndex,
} from '../model/board-drawing';
import { computeTopZIndex, needsInitialLayout } from '../model/board-layout';
import type { ExistingSticker } from '../model/poisson-cluster';
import type { StickerTransform } from '../model/board-transform';
import type { Point } from '../model/geometry';
import { useBoardCamera } from '../model/use-board-camera';
import { useCameraStickerGesture } from '../model/use-camera-sticker-gesture';
import { useDeleteSticker } from '../model/use-delete-sticker';
import { useDrawMode } from '../model/use-draw-mode';
import { useDrawingPersistence } from '../model/use-drawing-persistence';
import { useDrawingSelection } from '../model/use-drawing-selection';
import {
  EMPTY_BOARD_STICKER_INITIAL_TRANSFORM,
  useEmptyBoardRecenter,
} from '../model/use-empty-board-recenter';
import { useInitialStickerPlacement } from '../model/use-initial-sticker-placement';
import { useMoveSession } from '../model/use-move-session';
import { useRegenerateSticker } from '../model/use-regenerate-sticker';
import { useStickerQuickMenu } from '../model/use-sticker-quick-menu';

import type { ToolbarMode } from './BoardToolbar';
import { BOARD_TEXT_STYLE } from './board-text-style';
import { DrawingStroke } from './DrawingStroke';
import {
  EmptyBoardSticker,
  EMPTY_BOARD_STICKER_DEFAULT_TITLE,
  EMPTY_BOARD_STICKER_HEIGHT,
  EMPTY_BOARD_STICKER_ID,
  EMPTY_BOARD_STICKER_WIDTH,
  hideEmptyBoardStickerForSession,
  isEmptyBoardStickerHidden,
} from './empty-state/EmptyBoardSticker';
import { EmptyBoardStickerQuickMenu } from './empty-state/EmptyBoardStickerQuickMenu';
import { SelectBox } from './SelectBox';
import { SelectionBoxFrame } from './SelectionBoxFrame';
import { Sticker, type StickerData } from './Sticker';
import { StickerBadgeMark } from './StickerBadgeMark';
import { StickerPreview } from './StickerPreview';
import { StickerQuickMenu } from './StickerQuickMenu';

const DOT_SPACING_AT_MIN_ZOOM = 18;

type BoardCanvasProps = {
  boardId: string;
  mode: ToolbarMode;
  drawColor: string;
  drawStrokeWidth: number;
  // true인 동안은 포인터 입력을 무시한다 — 스포이드로 색을 고르는 동안 같은 드래그가
  // 캔버스에 그림으로도 그려지는 걸 막기 위함
  isPointerInputSuspended?: boolean;
  // 그리는 도중(pointerdown~up 사이) 여부가 바뀔 때마다 호출
  onDrawingActiveChange?: (active: boolean) => void;
  // 실행취소할 그림이 있는지 여부가 바뀔 때마다 호출
  onCanUndoChange?: (canUndo: boolean) => void;
  // 다시실행할 그림이 있는지 여부가 바뀔 때마다 호출
  onCanRedoChange?: (canRedo: boolean) => void;
  // 카메라 줌 배율이 바뀔 때마다 호출
  onCameraScaleChange?: (scale: number) => void;
  // 스포이드용 화면 캐시를 무효화해야 하는 보드 시각 변경 알림
  onVisualChange?: () => void;
  // 그림이 삭제 가능 상태(꾹 눌러 승격됨)인지 여부가 바뀔 때마다 호출
  onDrawingDeleteArmedChange?: (isArmed: boolean) => void;
  // 그림을 드래그하는 동안 휴지통 버튼 위에 있는지 여부가 바뀔 때마다 호출 — 놓기 전 확대 피드백에 사용
  onDrawingDragOverTrashChange?: (isOver: boolean) => void;
  // 그림 드래그-삭제 드롭 판정에 쓰는 휴지통 버튼의 DOM ref
  trashButtonRef?: RefObject<HTMLButtonElement | null>;
};

export type BoardCanvasHandle = {
  undoLastStroke: () => void;
  redoLastStroke: () => void;
  cancelMoveSession: () => void;
  createText: (text: string, fontSize: number, editWidth: number) => void;
  getViewportElement: () => HTMLDivElement | null;
};

type LocalTextItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  maxWidth: number;
  zIndex: number;
};

export function shouldShowBoardLoadError(isError: boolean, data: unknown): boolean {
  return isError && !data;
}

// 그리는 도중인 선의 실시간 미리보기는 스티커·그림 zIndex 값과 무관하게 항상 맨 위에 그려져야 한다
const LIVE_STROKE_Z_INDEX = 999999;

function hitTestSticker(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest('[data-sticker-id]');
  return el instanceof HTMLElement ? el : null;
}

export const BoardCanvas = forwardRef<BoardCanvasHandle, BoardCanvasProps>(function BoardCanvas(
  {
    boardId,
    mode,
    drawColor,
    drawStrokeWidth,
    isPointerInputSuspended = false,
    onDrawingActiveChange,
    onCanUndoChange,
    onCanRedoChange,
    onCameraScaleChange,
    onVisualChange,
    onDrawingDeleteArmedChange,
    onDrawingDragOverTrashChange,
    trashButtonRef,
  },
  ref,
) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { camera, setCamera, cameraRef, requestFocus } = useBoardCamera(boardId);
  const [localTexts, setLocalTexts] = useState<LocalTextItem[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isEmptyBoardQuickMenuOpen, setIsEmptyBoardQuickMenuOpen] = useState(false);
  // 삭제된 빈 스티커는 이번 세션 동안 숨긴다 — 앱 재시작 시 다시 보임
  const [isEmptyStickerHidden, setIsEmptyStickerHidden] = useState(isEmptyBoardStickerHidden);
  const [emptyBoardStickerTitle, setEmptyBoardStickerTitle] = useState(
    EMPTY_BOARD_STICKER_DEFAULT_TITLE,
  );
  const [emptyBoardStickerTransform, setEmptyBoardStickerTransform] = useState<StickerTransform>(
    EMPTY_BOARD_STICKER_INITIAL_TRANSFORM,
  );
  const { data, isLoading, isError, refetch, isStale } = useBoardQuery(boardId);
  const { mutate: saveLayout } = useUpdateBoardLayoutMutation();
  const { push } = useFlow();
  const { isActive } = useActivity();
  const queryClient = useQueryClient();
  const { regenerate, isRegenerating } = useRegenerateSticker(boardId);
  const { deleteSticker, isDeleting } = useDeleteSticker(boardId);
  const quickMenu = useStickerQuickMenu(boardId);
  const toast = useToast();
  const isEditMode = mode === 'move';
  const isDrawMode = mode === 'draw';
  const selectedId = isEditMode ? selectedStickerId : null;

  const rawStickers = data?.stickers ?? [];
  // 새로 생성됐지만 좌표를 아직 안 정한 스티커(posX/posY/zIndex가 null) — 빈 공간 배치 대상
  const unplacedStickers = rawStickers.filter(needsInitialLayout);
  const placedStickers: ExistingSticker[] = rawStickers
    .filter((sticker) => !needsInitialLayout(sticker))
    .map((sticker) => ({
      posX: sticker.posX!,
      posY: sticker.posY!,
      zIndex: sticker.zIndex!,
      scale: sticker.scale,
      rotation: sticker.rotation,
    }));

  const baseStickers: StickerData[] = useMemo(
    () =>
      [...rawStickers].map((sticker) => ({
        ...sticker,
        posX: sticker.posX ?? 0,
        posY: sticker.posY ?? 0,
        zIndex: sticker.zIndex ?? 0,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.stickers],
  );
  const emptyBoardSticker = useMemo<StickerData>(
    () => ({
      id: EMPTY_BOARD_STICKER_ID,
      type: 'IMAGE',
      title: emptyBoardStickerTitle,
      isNew: false,
      imageUrl: null,
      textContent: null,
      posX: emptyBoardStickerTransform.x,
      posY: emptyBoardStickerTransform.y,
      rotation: emptyBoardStickerTransform.rotation,
      scale: emptyBoardStickerTransform.scale,
      zIndex: 0,
      badgeOffsetX: 0,
      badgeOffsetY: 0,
    }),
    [emptyBoardStickerTitle, emptyBoardStickerTransform],
  );

  const baseDrawings: ParsedDrawing[] = useMemo(
    () =>
      (data?.drawings ?? []).map((drawing) => ({
        id: drawing.id,
        points: parseStrokePoints(drawing.stroke),
        color: drawing.color,
        strokeWidth: drawing.strokeWidth,
        zIndex: parseStrokeZIndex(drawing.stroke),
      })),
    [data?.drawings],
  );

  const {
    stickers: sessionStickers,
    drawings,
    applyStickerChange,
    applyDrawingChange,
    markDrawingDeleted,
    confirm: confirmMoveSession,
    discard: discardMoveSession,
  } = useMoveSession(boardId, baseStickers, baseDrawings);
  // 선택 시 zIndex가 올라간 스티커가 바로 맨 위로 그려지도록, 세션 반영분 기준으로 정렬한다
  const stickers = useMemo(
    () => [...sessionStickers].sort((a, b) => a.zIndex - b.zIndex),
    [sessionStickers],
  );

  const stickersRef = useRef(stickers);
  const drawingsRef = useRef(drawings);
  const isEditModeRef = useRef(isEditMode);
  const isDrawModeRef = useRef(isDrawMode);
  const isPointerInputSuspendedRef = useRef(isPointerInputSuspended);

  const pointersRef = useRef(new Map<number, Point>());

  useRefetchOnActive(refetch, isStale);

  // 보드에 있는 동안만 웹뷰 네이티브 바운스 스크롤을 꺼서 캔버스 드래그와 안 겹치게 함
  useEffect(() => {
    bridge.send('SET_BOARD_ACTIVE', { active: true });
    return () => bridge.send('SET_BOARD_ACTIVE', { active: false });
  }, []);

  // 스티커의 zIndex와 그림의 zIndex(stroke.zIndex)는 같은 숫자 공간을 공유한다 —
  // "맨 위로 올리기"는 항상 이 둘을 합친 풀 기준으로 계산해야 스티커·그림이 실제로 섞여 쌓인다
  const combinedZIndexPool = () => [
    ...stickersRef.current.map((s) => ({ id: s.id, zIndex: s.zIndex ?? 0 })),
    ...drawingsRef.current.map((d) => ({ id: d.id, zIndex: d.zIndex })),
  ];

  const { deleteDrawing, moveDrawing, confirmDraftDrawings } = useDrawingPersistence({
    boardId,
    queryClient,
    saveLayout,
  });

  const drawingSelection = useDrawingSelection({
    isEditMode,
    cameraRef,
    pointersRef,
    drawingsRef,
    trashButtonRef,
    hitTestSticker,
    combinedZIndexPool,
    setSelectedStickerId,
    applyDrawingChange,
    markDrawingDeleted,
    moveDrawing,
    deleteDrawing,
    onDrawingDeleteArmedChange,
    onDrawingDragOverTrashChange,
  });

  const cameraSticker = useCameraStickerGesture({
    boardId,
    isEditMode,
    cameraRef,
    setCamera,
    pointersRef,
    stickersRef,
    selectedId,
    emptyBoardSticker,
    hitTestSticker,
    combinedZIndexPool,
    setSelectedStickerId,
    applyStickerChange,
    setEmptyBoardStickerTransform,
    push,
    isActive,
    quickMenuStickerId: quickMenu.quickMenuStickerId,
    openQuickMenu: quickMenu.openQuickMenu,
    cancelDrawingLongPress: drawingSelection.cancelLongPress,
  });
  // 그림 선택은 이동 모드(이동 가능 상태)뿐 아니라 기본 모드(삭제 가능 상태)에서도 일어난다
  const activeSelectedDrawingId = drawingSelection.selectedDrawingId;

  // 편집 모드를 벗어났다가 다시 들어와도 이전 선택이 되살아나지 않도록 상태 자체를 지움.
  // useEffect 대신 렌더 중 비교 후 setState하는 방식(React 공식 권장 패턴)으로 처리해 커밋 사이클을 하나 아낀다
  const [prevIsEditMode, setPrevIsEditMode] = useState(isEditMode);
  if (isEditMode !== prevIsEditMode) {
    setPrevIsEditMode(isEditMode);
    if (!isEditMode) {
      setSelectedStickerId(null);
      drawingSelection.resetSelection();
    }
  }

  const drawMode = useDrawMode({
    isDrawMode,
    cameraRef,
    setCamera,
    pointersRef,
    drawColor,
    drawStrokeWidth,
    combinedZIndexPool,
    confirmDraftDrawings,
    onDrawingActiveChange,
    onCanUndoChange,
    onCanRedoChange,
  });

  const confirmMoveSessionRef = useRef(confirmMoveSession);
  const discardMoveSessionRef = useRef(discardMoveSession);
  // 포인터 이펙트가 등록될 때의 정적 클로저에서도 항상 최신 draw 모드/그림선택/카메라·스티커 훅 결과를 읽기 위함
  const drawModeRef = useRef(drawMode);
  const drawingSelectionRef = useRef(drawingSelection);
  const cameraStickerRef = useRef(cameraSticker);
  // createText(useImperativeHandle)에서 뷰포트 크기를 읽어야 해서 ref로도 들고 있는다
  const containerRef = useRef(container);

  // ref들을 매 렌더 이후 최신값으로 동기화
  useEffect(() => {
    stickersRef.current = stickers;
    drawingsRef.current = drawings;
    isEditModeRef.current = isEditMode;
    isDrawModeRef.current = isDrawMode;
    isPointerInputSuspendedRef.current = isPointerInputSuspended;
    confirmMoveSessionRef.current = confirmMoveSession;
    discardMoveSessionRef.current = discardMoveSession;
    drawModeRef.current = drawMode;
    drawingSelectionRef.current = drawingSelection;
    cameraStickerRef.current = cameraSticker;
    containerRef.current = container;
  });

  useEffect(() => {
    onCameraScaleChange?.(camera.scale);
  }, [camera.scale, onCameraScaleChange]);

  useEffect(() => {
    onVisualChange?.();
  }, [
    camera.x,
    camera.y,
    camera.scale,
    stickers,
    drawings,
    drawMode.draftDrawings,
    onVisualChange,
  ]);

  // 이동 모드를 나가면 이번 세션의 변경분을 저장하고 비운다. 명시적으로 취소(X)한 경우가
  // 아닌 모든 종료 경로(확정 버튼, 다른 툴바 모드로 전환 등)는 그리기 모드와 동일하게 자동 확정된다
  useEffect(() => {
    if (isEditMode) return;
    confirmMoveSessionRef.current();
  }, [isEditMode]);

  useImperativeHandle(
    ref,
    () => ({
      undoLastStroke: () => drawModeRef.current.undoLastStroke(),
      redoLastStroke: () => drawModeRef.current.redoLastStroke(),
      // 이동 모드 세션의 변경분을 버린다
      cancelMoveSession: () => {
        discardMoveSessionRef.current();
      },
      createText: (text: string, fontSize: number, editWidth: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const center = toWorldPoint(cameraRef.current, { x: rect.width / 2, y: rect.height / 2 });
        setLocalTexts((prev) => [
          ...prev,
          {
            id: uuidv7(),
            text,
            x: center.x,
            y: center.y,
            fontSize: fontSize / cameraRef.current.scale,
            maxWidth: editWidth / cameraRef.current.scale,
            zIndex: computeTopZIndex([
              ...combinedZIndexPool(),
              ...drawModeRef.current.draftDrawings,
              ...prev,
            ]),
          },
        ]);
      },
      getViewportElement: () => container,
    }),
    [container, cameraRef],
  );

  // 빈 보드의 월드 원점(0, 0)을 화면 정중앙 1배율에 둔다. 최초 진입은 즉시 맞추고,
  // 마지막 실제 스티커가 사라진 순간에는 기존 카메라 포커스 모션으로 이동한다.
  useEmptyBoardRecenter({
    container,
    data,
    setSelectedStickerId,
    setIsEmptyBoardQuickMenuOpen,
    setEmptyBoardStickerTransform,
    setCamera,
    requestFocus,
  });

  // 새로 생성돼 좌표가 없는 스티커를 빈 공간에 배치하고 저장한다
  useInitialStickerPlacement({
    boardId,
    container,
    data,
    unplacedStickers,
    placedStickers,
    queryClient,
    saveLayout,
    cameraRef,
    setCamera,
    requestFocus,
  });

  // 포인터, 휠 제스처는 Konva 없이 순수 DOM 이벤트로 직접 처리
  // pointerdown은 컨테이너에, move/up/cancel은 window에 붙여서 손가락이 컨테이너 밖으로 나가도(빠르게 드래그할 때 흔함) 계속 추적되게 함
  useEffect(() => {
    if (!container) return;

    const getLocalPoint = (e: PointerEvent): Point => {
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (isPointerInputSuspendedRef.current) return;
      // 퀵메뉴/이름 직접 편집 중엔 캔버스 제스처 비활성화
      if (quickMenu.isEditingRef.current) return;
      const point = getLocalPoint(e);
      pointersRef.current.set(e.pointerId, point);

      if (isDrawModeRef.current) {
        drawModeRef.current.onPointerDown(e, point);
        return;
      }

      // 이동 모드: 그림 탭=이동 가능 상태, 롱프레스=삭제 가능 상태로 승격.
      // 기본 모드: 이동 없이 롱프레스로 삭제 가능 상태 진입만 지원(스티커가 기본 모드에서 못 옮기는 것과 동일)
      if (drawingSelectionRef.current.onPointerDown(e, point)) return;

      cameraStickerRef.current.onPointerDown(e, point);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      const point = getLocalPoint(e);
      pointersRef.current.set(e.pointerId, point);

      if (isDrawModeRef.current) {
        drawModeRef.current.onPointerMove(e, point);
        return;
      }

      if (drawingSelectionRef.current.onPointerMove(e, point)) return;

      cameraStickerRef.current.onPointerMove(e, point);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      const point = getLocalPoint(e);
      pointersRef.current.delete(e.pointerId);

      if (isDrawModeRef.current) {
        drawModeRef.current.onPointerUp();
        return;
      }

      if (drawingSelectionRef.current.onPointerUp(e)) return;

      cameraStickerRef.current.onPointerUp(e, point);
    };

    const handleWheel = (e: WheelEvent) => {
      cameraStickerRef.current.onWheel(e, container);
    };

    // iOS Safari 제스처(핀치로 페이지 전체가 확대되는 것)를 막음
    const blockGesture = (e: Event) => e.preventDefault();

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('gesturestart', blockGesture);
    container.addEventListener('gesturechange', blockGesture);
    container.addEventListener('gestureend', blockGesture);

    return () => {
      cameraStickerRef.current.releasePressedSticker();
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('gesturestart', blockGesture);
      container.removeEventListener('gesturechange', blockGesture);
      container.removeEventListener('gestureend', blockGesture);
    };
  }, [container, boardId, quickMenu.isEditingRef, trashButtonRef]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-gray-400 text-body-04">보드를 불러오는 중이에요</p>
      </div>
    );
  }

  if (shouldShowBoardLoadError(isError, data)) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-gray-400 text-body-04">보드를 불러오지 못했어요</p>
      </div>
    );
  }

  const selectedSticker = stickers.find((sticker) => sticker.id === selectedId);
  const quickMenuSticker = stickers.find((sticker) => sticker.id === quickMenu.quickMenuStickerId);
  const directEditSticker = stickers.find(
    (sticker) => sticker.id === quickMenu.directEditStickerId,
  );
  const shouldBlurBoard = Boolean(quickMenuSticker || directEditSticker);
  const activeDrawingBoxTransform =
    drawingSelection.drawingBoxPinchPreview ?? drawingSelection.selectedDrawingBoxTransform;
  const isEmptyBoardStickerVisible = stickers.length === 0 && !isEmptyStickerHidden;
  const activeEmptyBoardStickerTransform =
    cameraSticker.dragTransform?.id === EMPTY_BOARD_STICKER_ID
      ? cameraSticker.dragTransform
      : emptyBoardStickerTransform;
  const openEmptyBoardStickerQuickMenu = () => {
    bridge.send('HAPTIC', { type: 'heavy' });
    setIsEmptyBoardQuickMenuOpen(true);
  };

  const dotZoomRatio = Math.max(camera.scale, DOT_FADE_START_ZOOM) / DOT_FADE_START_ZOOM;
  const dotFadeProgress = (camera.scale - BOARD_ZOOM_MIN) / (DOT_FADE_START_ZOOM - BOARD_ZOOM_MIN);
  const dotOpacity = Math.min(1, Math.max(0, dotFadeProgress));

  return (
    <div
      ref={setContainer}
      className="relative w-full h-full overflow-hidden touch-none"
      style={{ backgroundColor: '#000' }}
    >
      <div
        className="absolute inset-0"
        style={{ filter: shouldBlurBoard ? 'blur(30px)' : undefined }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
            backgroundSize: `${DOT_SPACING_AT_MIN_ZOOM}px ${DOT_SPACING_AT_MIN_ZOOM}px`,
            backgroundPosition: `${camera.x / dotZoomRatio}px ${camera.y / dotZoomRatio}px`,
            transform: `scale(${dotZoomRatio})`,
            transformOrigin: '0 0',
            opacity: dotOpacity,
          }}
        />
        {isEmptyBoardStickerVisible && isEmptyBoardQuickMenuOpen && (
          <EmptyBoardSticker
            title={emptyBoardStickerTitle}
            isQuickMenuOpen
            isEditMode={false}
            transform={activeEmptyBoardStickerTransform}
            onClick={() => push('Onboarding', {})}
            onLongPress={openEmptyBoardStickerQuickMenu}
          />
        )}
        <div
          style={
            {
              position: 'absolute',
              inset: 0,
              transformOrigin: '0 0',
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
              '--inv-camera-scale': 1 / camera.scale,
            } as React.CSSProperties
          }
        >
          {drawings.map((drawing) => {
            const isSelected = drawing.id === activeSelectedDrawingId;
            const isDragging = isSelected && drawingSelection.drawingDragOffset !== null;
            const pinchPreview = isSelected ? drawingSelection.drawingPinchPreview : null;

            return (
              <svg
                key={drawing.id}
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'visible',
                  pointerEvents: 'none',
                  zIndex: drawingZIndex(drawing),
                  willChange: 'transform',
                }}
              >
                <g
                  transform={
                    isDragging
                      ? `translate(${drawingSelection.drawingDragOffset!.x}, ${drawingSelection.drawingDragOffset!.y})`
                      : undefined
                  }
                >
                  <DrawingStroke
                    points={pinchPreview?.points ?? drawing.points}
                    color={drawing.color}
                    strokeWidth={pinchPreview?.strokeWidth ?? drawing.strokeWidth}
                  />
                </g>
              </svg>
            );
          })}
          {localTexts.map((item) => (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: item.x,
                top: item.y,
                transform: 'translate(-50%, -50%)',
                zIndex: item.zIndex,
                fontSize: item.fontSize,
                color: '#fff',
                width: item.maxWidth,
                pointerEvents: 'none',
                ...BOARD_TEXT_STYLE,
                whiteSpace: 'pre',
              }}
            >
              {item.text}
            </div>
          ))}
          {/* 이번 세션에 그린 draft — 아직 저장 전이라 선택/드래그 대상이 아니다 */}
          {drawMode.draftDrawings.map((drawing) => (
            <svg
              key={drawing.id}
              style={{
                position: 'absolute',
                inset: 0,
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: drawingZIndex(drawing),
                willChange: 'transform',
              }}
            >
              <DrawingStroke
                points={drawing.points}
                color={drawing.color}
                strokeWidth={drawing.strokeWidth}
              />
            </svg>
          ))}
          {/* 그리는 도중인 선의 실시간 미리보기 — 항상 맨 위에 그려짐 */}
          {drawMode.drawingPoints && (
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: LIVE_STROKE_Z_INDEX,
                willChange: 'transform',
              }}
            >
              <DrawingStroke
                points={drawMode.drawingPoints}
                color={drawColor}
                strokeWidth={drawStrokeWidth}
              />
            </svg>
          )}
          {drawingSelection.selectedDrawingBaseSize && activeDrawingBoxTransform && (
            <SelectionBoxFrame
              x={activeDrawingBoxTransform.x + (drawingSelection.drawingDragOffset?.x ?? 0)}
              y={activeDrawingBoxTransform.y + (drawingSelection.drawingDragOffset?.y ?? 0)}
              width={
                drawingSelection.selectedDrawingBaseSize.width * activeDrawingBoxTransform.scale
              }
              height={
                drawingSelection.selectedDrawingBaseSize.height * activeDrawingBoxTransform.scale
              }
              rotation={activeDrawingBoxTransform.rotation}
              zIndex={9999}
            />
          )}
          {isEmptyBoardStickerVisible && !isEmptyBoardQuickMenuOpen && (
            <>
              <EmptyBoardSticker
                title={emptyBoardStickerTitle}
                isQuickMenuOpen={false}
                isEditMode={isEditMode}
                transform={activeEmptyBoardStickerTransform}
                onClick={() => push('Onboarding', {})}
                onLongPress={openEmptyBoardStickerQuickMenu}
              />
              {selectedId === EMPTY_BOARD_STICKER_ID && (
                <SelectionBoxFrame
                  x={activeEmptyBoardStickerTransform.x}
                  y={activeEmptyBoardStickerTransform.y}
                  width={EMPTY_BOARD_STICKER_WIDTH * activeEmptyBoardStickerTransform.scale}
                  height={EMPTY_BOARD_STICKER_HEIGHT * activeEmptyBoardStickerTransform.scale}
                  rotation={activeEmptyBoardStickerTransform.rotation}
                  zIndex={9999}
                />
              )}
            </>
          )}
          {stickers.map((sticker) => (
            <Sticker
              key={sticker.id}
              sticker={sticker}
              selected={selectedId === sticker.id}
              transformOverride={
                cameraSticker.dragTransform?.id === sticker.id
                  ? cameraSticker.dragTransform
                  : undefined
              }
              onRasterReady={onVisualChange}
            />
          ))}
          {stickers
            .filter((sticker) => sticker.id !== selectedId)
            .map((sticker) => (
              <StickerBadgeMark
                key={sticker.id}
                sticker={sticker}
                isEditMode={isEditMode || isPointerInputSuspended}
                onNameClick={quickMenu.startDirectEdit}
              />
            ))}
          {selectedSticker && (
            <SelectBox
              sticker={selectedSticker}
              transformOverride={
                cameraSticker.dragTransform?.id === selectedSticker.id
                  ? cameraSticker.dragTransform
                  : undefined
              }
            />
          )}
        </div>
      </div>
      {directEditSticker && (
        <>
          <div
            aria-hidden
            className="modal-overlay fixed inset-0 z-50"
            onClick={() => quickMenu.finishDirectEditFromBackdrop()}
          />
          <StickerPreview
            sticker={directEditSticker}
            titleInputRef={quickMenu.directEditInputRef}
            isEditingTitle
            onSubmitTitle={quickMenu.submitDirectEdit}
            onCancelEditTitle={quickMenu.cancelDirectEdit}
          />
        </>
      )}
      <StickerQuickMenu
        sticker={quickMenuSticker}
        isOpen={quickMenu.quickMenuStickerId !== null}
        onClose={quickMenu.closeQuickMenu}
        openedFromEdit={quickMenu.quickMenuOpenedFromEdit}
        onRename={quickMenu.startRenameFromQuickMenu}
        onRegenerate={() => {
          if (quickMenu.quickMenuStickerId) {
            regenerate(quickMenu.quickMenuStickerId, quickMenu.closeQuickMenu);
          }
        }}
        isRegenerating={isRegenerating}
        onDelete={() => {
          if (quickMenu.quickMenuStickerId) {
            deleteSticker(quickMenu.quickMenuStickerId, quickMenu.closeQuickMenu);
          }
        }}
        isDeleting={isDeleting}
      />
      <EmptyBoardStickerQuickMenu
        title={emptyBoardStickerTitle}
        isOpen={isEmptyBoardQuickMenuOpen}
        onClose={() => setIsEmptyBoardQuickMenuOpen(false)}
        onRename={setEmptyBoardStickerTitle}
        onDelete={() => {
          hideEmptyBoardStickerForSession();
          setIsEmptyStickerHidden(true);
          setSelectedStickerId(null);
          toast('삭제가 완료되었어요');
        }}
      />
    </div>
  );
});
