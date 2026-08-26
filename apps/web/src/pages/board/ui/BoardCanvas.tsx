'use client';

import { useFlow } from '@stackflow/react';
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
import { stickerQueryOptions } from '@/entities/sticker/api/sticker-queries';
import { bridge } from '@/shared/lib/bridge';
import { useLongPress } from '@/shared/lib/use-long-press';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';
import { useToast } from '@/shared/ui/common/Toast';

import {
  BOARD_ZOOM_MIN,
  DOT_FADE_START_ZOOM,
  computeBoardPinchZoom,
  panCamera,
  toWorldPoint,
  zoomCamera,
  zoomCameraTo,
} from '../model/board-camera';
import {
  computeDrawingBoxPinchTransform,
  computeDrawingPinchTransform,
  type DrawingBoxTransform,
  drawingZIndex,
  getDrawingBounds,
  hitTestDrawingId,
  isPointInDrawingBounds,
  type ParsedDrawing,
  parseStrokePoints,
  parseStrokeZIndex,
  toDrawingMoveInput,
} from '../model/board-drawing';
import {
  type DrawingSelectionGesture,
  drawingSelectionGestureReducer,
} from '../model/board-drawing-selection';
import { type DragTransform, type Gesture, gestureReducer } from '../model/board-gesture';
import { computeBringToFrontZIndex, needsInitialLayout } from '../model/board-layout';
import type { ExistingSticker } from '../model/poisson-cluster';
import {
  computeStickerPinchTransform,
  type PinchSample,
  scaleBadgeOffset,
  type StickerTransform,
} from '../model/board-transform';
import { angleBetween, centroid, distance, type Point } from '../model/geometry';
import { useBoardCamera } from '../model/use-board-camera';
import { useDeleteSticker } from '../model/use-delete-sticker';
import { useDrawMode } from '../model/use-draw-mode';
import { useDrawingPersistence } from '../model/use-drawing-persistence';
import {
  EMPTY_BOARD_STICKER_INITIAL_TRANSFORM,
  useEmptyBoardRecenter,
} from '../model/use-empty-board-recenter';
import { useInitialStickerPlacement } from '../model/use-initial-sticker-placement';
import { useMoveSession } from '../model/use-move-session';
import { useRegenerateSticker } from '../model/use-regenerate-sticker';
import { useStickerQuickMenu } from '../model/use-sticker-quick-menu';

import type { ToolbarMode } from './BoardToolbar';
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
  getViewportElement: () => HTMLDivElement | null;
};

export function shouldShowBoardLoadError(isError: boolean, data: unknown): boolean {
  return isError && !data;
}

// 탭과 드래그를 구분하는 이동 허용 오차(px)
const TAP_MOVE_THRESHOLD = 6;
// 더블탭으로 인정하는 두 탭 사이의 최대 시간(ms), 위치 오차(px)
const DOUBLE_TAP_MAX_INTERVAL_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE = 24;
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
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [dragTransform, setDragTransform] = useState<DragTransform | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [drawingDragOffset, setDrawingDragOffset] = useState<Point | null>(null);
  // 선택된 그림을 꾹 눌러 삭제 가능 상태로 승격했는지
  const [isDrawingDeleteArmed, setIsDrawingDeleteArmed] = useState(false);
  // 선택된 그림을 드래그하는 동안, 현재 휴지통 버튼 위에 있는지 — 놓기 전 시각 피드백(확대)에 사용
  const [isDrawingOverTrash, setIsDrawingOverTrash] = useState(false);
  // 선택된 그림을 두 손가락으로 회전+확대하는 동안의 실시간 미리보기(점/굵기). 아니면 null
  const [drawingPinchPreview, setDrawingPinchPreview] = useState<{
    points: Point[];
    strokeWidth: number;
  } | null>(null);
  // 선택 박스의 원래 크기(선택 시점 기준, 회전과 무관하게 고정) — 선택 해제 후 다시 선택하면 새로 계산
  const [selectedDrawingBaseSize, setSelectedDrawingBaseSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // 선택 박스의 현재 중심/회전/배율(직전 제스처까지 반영된, 확정된 값)
  const [selectedDrawingBoxTransform, setSelectedDrawingBoxTransform] =
    useState<DrawingBoxTransform | null>(null);
  // 두 손가락으로 회전+확대하는 동안의 선택 박스 실시간 미리보기. 아니면 null
  const [drawingBoxPinchPreview, setDrawingBoxPinchPreview] = useState<DrawingBoxTransform | null>(
    null,
  );
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
  const queryClient = useQueryClient();
  const { regenerate, isRegenerating } = useRegenerateSticker(boardId);
  const { deleteSticker, isDeleting } = useDeleteSticker(boardId);
  const quickMenu = useStickerQuickMenu(boardId);
  const toast = useToast();
  const isEditMode = mode === 'move';
  const isDrawMode = mode === 'draw';
  const selectedId = isEditMode ? selectedStickerId : null;
  // 그림 선택은 이동 모드(이동 가능 상태)뿐 아니라 기본 모드(삭제 가능 상태)에서도 일어난다
  const activeSelectedDrawingId = selectedDrawingId;

  // 편집 모드를 벗어났다가 다시 들어와도 이전 선택이 되살아나지 않도록 상태 자체를 지움.
  // useEffect 대신 렌더 중 비교 후 setState하는 방식(React 공식 권장 패턴)으로 처리해 커밋 사이클을 하나 아낀다
  const [prevIsEditMode, setPrevIsEditMode] = useState(isEditMode);
  if (isEditMode !== prevIsEditMode) {
    setPrevIsEditMode(isEditMode);
    if (!isEditMode) {
      setSelectedStickerId(null);
      setSelectedDrawingId(null);
      setDrawingDragOffset(null);
      setIsDrawingOverTrash(false);
      setIsDrawingDeleteArmed(false);
      setDrawingPinchPreview(null);
      setSelectedDrawingBaseSize(null);
      setSelectedDrawingBoxTransform(null);
      setDrawingBoxPinchPreview(null);
    }
  }

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
  const emptyBoardStickerRef = useRef(emptyBoardSticker);
  const selectedIdRef = useRef(selectedId);
  const selectedDrawingIdRef = useRef(activeSelectedDrawingId);
  const isEditModeRef = useRef(isEditMode);
  const isDrawModeRef = useRef(isDrawMode);
  const isPointerInputSuspendedRef = useRef(isPointerInputSuspended);
  const dragTransformRef = useRef<DragTransform | null>(null);
  // 선택된 그림의 드래그/핀치 모드와 그 시작 기준값 — drawingSelectionGestureReducer가 전이를 담당
  const drawingSelectionGestureRef = useRef<DrawingSelectionGesture | null>(null);
  // handlePointerUp에서 최종 이동량을 읽어야 해서 state와 별도로 ref에도 최신값을 들고 있는다
  const drawingDragOffsetRef = useRef<Point | null>(null);
  // 휴지통 호버 진입 순간에만 햅틱을 울리기 위해 직전 프레임의 호버 여부를 들고 있는다
  const wasOverTrashRef = useRef(false);
  // handlePointerUp에서 최종 결과를 읽어야 해서 state와 별도로 ref에도 최신값을 들고 있는다
  const drawingPinchPreviewRef = useRef<{ points: Point[]; strokeWidth: number } | null>(null);
  // 선택 박스의 확정된 중심/회전/배율 — pointerdown에서 제스처 시작 기준값으로 읽어야 해서 ref로도 들고 있는다
  const selectedDrawingBoxTransformRef = useRef<DrawingBoxTransform | null>(null);
  // handlePointerUp에서 최종 결과를 읽어야 해서 state와 별도로 ref에도 최신값을 들고 있는다
  const drawingBoxPinchPreviewRef = useRef<DrawingBoxTransform | null>(null);

  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);
  const tapCandidateRef = useRef<{
    pointerId: number;
    stickerId: string | null;
    startClient: Point;
  } | null>(null);
  const pressedStickerRef = useRef<HTMLElement | null>(null);
  // 더블탭 감지용 — 직전에 빈 배경을 탭한 시각·위치
  const lastBackgroundTapRef = useRef<{ time: number; point: Point } | null>(null);

  // 롱프레스가 성사된 순간부터 퀵메뉴가 닫힐 때까지 눌린 연출을 잠근다. 이 사이에
  // 포인터 업·취소 등 여러 경로가 clearPressedSticker를 부르는데, 그걸 그대로 두면
  // 메뉴가 뜨기도 전에 스티커가 원래 크기로 줄어드는 게 보인다
  const isPressedStickerLockedRef = useRef(false);

  const releasePressedSticker = () => {
    isPressedStickerLockedRef.current = false;
    pressedStickerRef.current?.removeAttribute('data-pressed');
    pressedStickerRef.current = null;
  };

  const clearPressedSticker = () => {
    if (isPressedStickerLockedRef.current) return;
    releasePressedSticker();
  };

  // 퀵메뉴가 닫히는 순간에 맞춰 원래 크기로 되돌린다
  useEffect(() => {
    if (quickMenu.quickMenuStickerId === null) releasePressedSticker();
  }, [quickMenu.quickMenuStickerId]);

  const longPress = useLongPress({
    onLongPress: (stickerId) => {
      isPressedStickerLockedRef.current = true;
      bridge.send('HAPTIC', { type: 'heavy' });
      quickMenu.openQuickMenu(stickerId);
      // 리캡 이동과 안 겹치게 탭 후보 제거
      tapCandidateRef.current = null;
    },
    onPressEnd: clearPressedSticker,
  });

  // 그림은 pointerdown 즉시 선택(selectDrawing)되고, 계속 누른 채 유지하면 이 롱프레스가
  // 발동해 삭제 가능 상태로 승격한다(휴지통 바 노출) — 손을 떼지 않고 그대로 끌면 드래그가 이어져
  // 휴지통 위에서 놓으면 삭제된다
  const drawingLongPress = useLongPress({
    onLongPress: (drawingId) => {
      bridge.send('HAPTIC', { type: 'heavy' });
      if (!isEditModeRef.current) {
        selectDrawingRef.current(drawingId);
      }
      setIsDrawingDeleteArmed(true);
    },
  });

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

  // 스티커를 선택하면 스티커+그림 통틀어 맨 위로 보이도록 zIndex를 올림(세션 로컬 변경분)
  const selectSticker = (sticker: StickerData): StickerData => {
    setSelectedStickerId(sticker.id);
    const newZIndex = computeBringToFrontZIndex(combinedZIndexPool(), sticker.id);
    if (newZIndex === null) return sticker;
    applyStickerChangeRef.current(sticker.id, { zIndex: newZIndex });
    return { ...sticker, zIndex: newZIndex };
  };

  // 그림을 선택하면(탭 또는 롱프레스 시작) 스티커 선택은 해제하고, 스티커+그림 통틀어
  // 맨 위로 보이도록 zIndex를 올린다. 삭제 가능 상태로의 승격은 별도(drawingLongPress)로 처리한다.
  // 이동 모드는 세션 로컬 변경분에 반영하고, 기본 모드는(세션 개념이 없으므로) 바로 저장한다
  const selectDrawing = (drawingId: string) => {
    setSelectedStickerId(null);
    setSelectedDrawingId(drawingId);
    const drawing = drawingsRef.current.find((d) => d.id === drawingId);
    const bounds = drawing && getDrawingBounds(drawing.points, drawing.strokeWidth);
    if (bounds) {
      setSelectedDrawingBaseSize({ width: bounds.width, height: bounds.height });
      setSelectedDrawingBoxTransform({ x: bounds.x, y: bounds.y, rotation: 0, scale: 1 });
    }

    if (drawing) {
      const newZIndex = computeBringToFrontZIndex(combinedZIndexPool(), drawingId);
      if (newZIndex !== null) {
        if (isEditModeRef.current) {
          applyDrawingChangeRef.current(drawingId, { zIndex: newZIndex });
        } else {
          moveDrawingRef.current(
            toDrawingMoveInput(drawing.id, drawing.points, {
              color: drawing.color,
              strokeWidth: drawing.strokeWidth,
              zIndex: newZIndex,
            }),
          );
        }
      }
    }
  };

  const { deleteDrawing, moveDrawing, confirmDraftDrawings } = useDrawingPersistence({
    boardId,
    queryClient,
    saveLayout,
  });

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

  const applyStickerChangeRef = useRef(applyStickerChange);
  const applyDrawingChangeRef = useRef(applyDrawingChange);
  const markDrawingDeletedRef = useRef(markDrawingDeleted);
  const confirmMoveSessionRef = useRef(confirmMoveSession);
  const discardMoveSessionRef = useRef(discardMoveSession);
  const selectStickerRef = useRef(selectSticker);
  const selectDrawingRef = useRef(selectDrawing);
  const deleteDrawingRef = useRef(deleteDrawing);
  const moveDrawingRef = useRef(moveDrawing);
  const drawingsRef = useRef(drawings);
  const pushRef = useRef(push);
  const longPressRef = useRef(longPress);
  const drawingLongPressRef = useRef(drawingLongPress);
  // 포인터 이펙트가 등록될 때의 정적 클로저에서도 항상 최신 draw 모드 훅 결과를 읽기 위함
  const drawModeRef = useRef(drawMode);

  // ref들을 매 렌더 이후 최신값으로 동기화
  useEffect(() => {
    stickersRef.current = stickers;
    emptyBoardStickerRef.current = emptyBoardSticker;
    selectedIdRef.current = selectedId;
    selectedDrawingIdRef.current = activeSelectedDrawingId;
    selectedDrawingBoxTransformRef.current = selectedDrawingBoxTransform;
    isEditModeRef.current = isEditMode;
    isDrawModeRef.current = isDrawMode;
    isPointerInputSuspendedRef.current = isPointerInputSuspended;
    applyStickerChangeRef.current = applyStickerChange;
    applyDrawingChangeRef.current = applyDrawingChange;
    markDrawingDeletedRef.current = markDrawingDeleted;
    confirmMoveSessionRef.current = confirmMoveSession;
    discardMoveSessionRef.current = discardMoveSession;
    selectStickerRef.current = selectSticker;
    selectDrawingRef.current = selectDrawing;
    deleteDrawingRef.current = deleteDrawing;
    moveDrawingRef.current = moveDrawing;
    drawingsRef.current = drawings;
    pushRef.current = push;
    longPressRef.current = longPress;
    drawingLongPressRef.current = drawingLongPress;
    drawModeRef.current = drawMode;
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

  // 그림이 삭제 가능 상태인지를 부모에 알림 — 상단 UI 숨김/하단 삭제 바 전환에 사용
  useEffect(() => {
    onDrawingDeleteArmedChange?.(isDrawingDeleteArmed);
  }, [isDrawingDeleteArmed, onDrawingDeleteArmedChange]);

  useEffect(() => {
    onDrawingDragOverTrashChange?.(isDrawingOverTrash);
  }, [isDrawingOverTrash, onDrawingDragOverTrashChange]);

  // move 모드를 벗어나면 그림 선택 드래그/핀치 관련 ref도 정리 — 렌더 중엔 ref를 못 건드려 별도 effect로 분리
  useEffect(() => {
    if (isEditMode) return;
    drawingSelectionGestureRef.current = null;
    drawingDragOffsetRef.current = null;
    drawingPinchPreviewRef.current = null;
    selectedDrawingBoxTransformRef.current = null;
    drawingBoxPinchPreviewRef.current = null;
  }, [isEditMode]);

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
      getViewportElement: () => container,
    }),
    [container],
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

    const isOverTrash = (e: PointerEvent): boolean => {
      const rect = trashButtonRef?.current?.getBoundingClientRect();
      if (!rect) return false;
      return (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
    };

    const setLiveTransform = (next: DragTransform | null) => {
      dragTransformRef.current = next;
      setDragTransform(next);
    };

    const setLiveDrawingDragOffset = (next: Point | null) => {
      drawingDragOffsetRef.current = next;
      setDrawingDragOffset(next);
    };

    const setLiveDrawingPinchPreview = (next: { points: Point[]; strokeWidth: number } | null) => {
      drawingPinchPreviewRef.current = next;
      setDrawingPinchPreview(next);
    };

    const setLiveDrawingBoxPinchPreview = (next: DrawingBoxTransform | null) => {
      drawingBoxPinchPreviewRef.current = next;
      setDrawingBoxPinchPreview(next);
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
      if (isEditModeRef.current || !isDrawModeRef.current) {
        if (pointersRef.current.size === 1) {
          const worldPoint = toWorldPoint(cameraRef.current, point);

          if (isEditModeRef.current && selectedDrawingIdRef.current) {
            const selected = drawingsRef.current.find(
              (drawing) => drawing.id === selectedDrawingIdRef.current,
            );
            const bounds = selected && getDrawingBounds(selected.points, selected.strokeWidth);

            if (bounds && isPointInDrawingBounds(worldPoint, bounds)) {
              drawingSelectionGestureRef.current = drawingSelectionGestureReducer(
                drawingSelectionGestureRef.current,
                { type: 'POINTER_DOWN', pointerId: e.pointerId, worldPoint },
              );
              setLiveDrawingDragOffset({ x: 0, y: 0 });
              wasOverTrashRef.current = false;
              // 이미 선택된 그림을 다시 눌러도, 계속 누르고 있으면 삭제 가능 상태로 승격될 수 있다
              drawingLongPressRef.current.start(point, selectedDrawingIdRef.current);
            } else {
              setSelectedDrawingId(null);
              setSelectedDrawingBaseSize(null);
              setSelectedDrawingBoxTransform(null);
            }
            return;
          }

          if (!hitTestSticker(e.target)) {
            const hitDrawingId = hitTestDrawingId(worldPoint, drawingsRef.current);
            if (hitDrawingId) {
              // 이동 모드는 탭하면 바로 선택(이동 가능 상태)되고, 기본 모드는 롱프레스가
              // 발동하는 순간에만 선택된다(delete-armed와 동시에) — 기존 그림을 선택하는
              // 중엔 스티커 팬/선택을 시작하지 않는다
              if (isEditModeRef.current) {
                selectDrawingRef.current(hitDrawingId);
              }
              drawingSelectionGestureRef.current = drawingSelectionGestureReducer(
                drawingSelectionGestureRef.current,
                { type: 'POINTER_DOWN', pointerId: e.pointerId, worldPoint },
              );
              setLiveDrawingDragOffset({ x: 0, y: 0 });
              wasOverTrashRef.current = false;
              drawingLongPressRef.current.start(point, hitDrawingId);
              return;
            }
          }
        } else if (pointersRef.current.size === 2 && selectedDrawingIdRef.current) {
          drawingLongPressRef.current.cancel();
          const points = [...pointersRef.current.values()];
          setLiveDrawingDragOffset(null);
          setIsDrawingOverTrash(false);
          wasOverTrashRef.current = false;

          const selected = drawingsRef.current.find(
            (drawing) => drawing.id === selectedDrawingIdRef.current,
          );
          drawingSelectionGestureRef.current = selected
            ? drawingSelectionGestureReducer(drawingSelectionGestureRef.current, {
                type: 'MULTI_TOUCH',
                points: [points[0]!, points[1]!],
                camera: cameraRef.current,
                basePoints: selected.points,
                baseStrokeWidth: selected.strokeWidth,
                baseBoxTransform: selectedDrawingBoxTransformRef.current,
              })
            : null;
          return;
        }
      }

      if (pointersRef.current.size !== 1) {
        tapCandidateRef.current = null;
        longPressRef.current.cancel();
        drawingLongPressRef.current.cancel();
        return;
      }

      const stickerElement = hitTestSticker(e.target);
      const stickerId = stickerElement?.dataset.stickerId ?? null;
      const isEmptyBoardSticker = stickerId === EMPTY_BOARD_STICKER_ID;
      // 빈 보드 PPOTTO의 기본 모드 클릭·롱프레스는 자체 핸들러가 담당한다.
      tapCandidateRef.current = isEmptyBoardSticker
        ? null
        : { pointerId: e.pointerId, stickerId, startClient: point };

      // 편집 모드에선 pointerdown이 바로 드래그로 이어지므로 롱프레스는 기본 뷰 모드에서만
      if (stickerId && stickerElement && !isEmptyBoardSticker && !isEditModeRef.current) {
        releasePressedSticker();
        longPressRef.current.start(point, stickerId);
        stickerElement.dataset.pressed = 'true';
        pressedStickerRef.current = stickerElement;
      }

      // 스티커를 처음 선택하는 순간이면 맨 위로 올리는 부수효과를 먼저 실행하고,
      // 그 결과(갱신된 zIndex)를 반영한 스티커를 reducer에 넘긴다 (편집 모드에서만 선택/저장 부수효과 발생)
      const found =
        stickerId && isEditModeRef.current
          ? isEmptyBoardSticker
            ? emptyBoardStickerRef.current
            : stickersRef.current.find((s) => s.id === stickerId)
          : undefined;
      let stickerHit: StickerData | null = null;
      if (found) {
        if (isEmptyBoardSticker) {
          setSelectedStickerId(EMPTY_BOARD_STICKER_ID);
          stickerHit = found;
        } else {
          stickerHit =
            selectedIdRef.current !== stickerId ? selectStickerRef.current(found) : found;
        }
      }

      gestureRef.current = gestureReducer(gestureRef.current, {
        type: 'POINTER_DOWN',
        pointerId: e.pointerId,
        point,
        camera: cameraRef.current,
        stickerHit,
        isEditMode: isEditModeRef.current,
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      const point = getLocalPoint(e);
      pointersRef.current.set(e.pointerId, point);

      if (isDrawModeRef.current) {
        drawModeRef.current.onPointerMove(e, point);
        return;
      }

      if (isEditModeRef.current || !isDrawModeRef.current) {
        if (pointersRef.current.size >= 2) {
          drawingLongPressRef.current.cancel();
          const selectionGesture = drawingSelectionGestureRef.current;

          if (selectionGesture?.kind === 'dragging') {
            // 드래그 중 두 번째 손가락이 닿으면 드래그를 취소한다(선택은 유지)
            drawingSelectionGestureRef.current = null;
            setLiveDrawingDragOffset(null);
            setIsDrawingOverTrash(false);
            wasOverTrashRef.current = false;
          } else if (selectionGesture?.kind === 'pinching') {
            const points = [...pointersRef.current.values()];
            const { basePoints, baseStrokeWidth, baseBoxTransform, startSample } = selectionGesture;
            const current: PinchSample = {
              centroid: toWorldPoint(cameraRef.current, centroid(points)),
              distance: distance(points[0]!, points[1]!),
              angle: angleBetween(points[0]!, points[1]!),
            };
            setLiveDrawingPinchPreview(
              computeDrawingPinchTransform(basePoints, baseStrokeWidth, startSample, current),
            );
            if (baseBoxTransform) {
              setLiveDrawingBoxPinchPreview(
                computeDrawingBoxPinchTransform(baseBoxTransform, startSample, current),
              );
            }
            return;
          }
          // 선택된 그림이 없으면(핀치 시작 안 됐으면) 기존 스티커/카메라 핀치 로직으로 계속 진행
        } else if (selectedDrawingIdRef.current) {
          const gesture = drawingSelectionGestureRef.current;
          if (gesture?.kind !== 'dragging' || gesture.pointerId !== e.pointerId) return;
          // 너무 많이 움직이면 삭제 가능 상태로의 승격이 취소되고(제자리에서 계속 누르고 있어야
          // 승격됨), 이미 승격된 뒤라면 이 호출은 아무 효과가 없다
          drawingLongPressRef.current.move(point);
          const worldPoint = toWorldPoint(cameraRef.current, point);
          setLiveDrawingDragOffset({
            x: worldPoint.x - gesture.startWorldPoint.x,
            y: worldPoint.y - gesture.startWorldPoint.y,
          });
          const overTrash = isOverTrash(e);
          // 휴지통 위로 막 넘어온 순간(rising edge)에만 햅틱 — 계속 위에 머물러도 반복 발동하지 않는다
          if (overTrash && !wasOverTrashRef.current) {
            bridge.send('HAPTIC', { type: 'medium' });
          }
          wasOverTrashRef.current = overTrash;
          setIsDrawingOverTrash(overTrash);
          return;
        } else {
          // 롱프레스로 그림을 고르는 중이면(아직 선택 확정 전), 너무 많이 움직이면 취소되게 계속 알려준다
          drawingLongPressRef.current.move(point);
        }
      }

      if (tapCandidateRef.current?.pointerId === e.pointerId) {
        if (distance(tapCandidateRef.current.startClient, point) > TAP_MOVE_THRESHOLD) {
          tapCandidateRef.current = null;
        }
      }

      longPressRef.current.move(point);

      const gesture = gestureRef.current;
      if (!gesture) return;

      if (pointersRef.current.size >= 2) {
        // 두 손가락이 됐으면 탭일 수 없음
        tapCandidateRef.current = null;
        longPressRef.current.cancel();

        const points = [...pointersRef.current.values()];

        // 배경을 팬하던 중이면 보드 핀치줌으로, 스티커를 이동하던 중이면 스티커 회전+확대로 전환(rebase).
        // 이미 pinch/stickerPinch면 reducer가 상태를 그대로 반환한다
        gestureRef.current = gestureReducer(gestureRef.current, {
          type: 'MULTI_TOUCH',
          points: [points[0]!, points[1]!],
          camera: cameraRef.current,
          liveTransform: dragTransformRef.current,
        });

        if (gestureRef.current?.kind === 'pinch') {
          setCamera(
            computeBoardPinchZoom(
              gestureRef.current.startCamera,
              {
                centroid: gestureRef.current.startCentroid,
                distance: gestureRef.current.startDistance,
              },
              { centroid: centroid(points), distance: distance(points[0]!, points[1]!) },
            ),
          );
        } else if (gestureRef.current?.kind === 'stickerPinch') {
          const current = {
            centroid: toWorldPoint(cameraRef.current, centroid(points)),
            distance: distance(points[0]!, points[1]!),
            angle: angleBetween(points[0]!, points[1]!),
          };
          const result = computeStickerPinchTransform(
            gestureRef.current.startTransform,
            {
              centroid: gestureRef.current.startCentroid,
              distance: gestureRef.current.startDistance,
              angle: gestureRef.current.startAngle,
            },
            current,
          );
          // 회전이 수평·수직(90° 배수) 스냅에 걸리는 순간에만 1회 햅틱 — 스냅 값은 정확히
          // 90의 배수로 떨어지므로 직전 프레임과의 상태 전환으로 감지한다
          const previousRotation = dragTransformRef.current?.rotation;
          if (
            result.rotation % 90 === 0 &&
            previousRotation !== undefined &&
            previousRotation % 90 !== 0
          ) {
            bridge.send('HAPTIC', { type: 'light' });
          }
          setLiveTransform({ id: gestureRef.current.sticker.id, ...result });
        }
        return;
      }

      if (gesture.kind === 'pan' && gesture.pointerId === e.pointerId) {
        setCamera({
          scale: gesture.startCamera.scale,
          x: gesture.startCamera.x + (point.x - gesture.startClient.x),
          y: gesture.startCamera.y + (point.y - gesture.startClient.y),
        });
        return;
      }

      if (gesture.kind === 'move' && gesture.pointerId === e.pointerId) {
        const scale = cameraRef.current.scale;
        setLiveTransform({
          id: gesture.sticker.id,
          x: gesture.startTransform.x + (point.x - gesture.startClient.x) / scale,
          y: gesture.startTransform.y + (point.y - gesture.startClient.y) / scale,
          rotation: gesture.startTransform.rotation,
          scale: gesture.startTransform.scale,
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      const point = getLocalPoint(e);
      pointersRef.current.delete(e.pointerId);

      if (isDrawModeRef.current) {
        drawModeRef.current.onPointerUp();
        return;
      }

      if (isEditModeRef.current || !isDrawModeRef.current) {
        // 손을 뗐는데 롱프레스 타이머가 아직 안 끝났으면(=탭이었으면) 취소 —
        // 안 그러면 손을 뗀 뒤에도 타이머가 계속 돌다가 뒤늦게 선택돼버린다
        drawingLongPressRef.current.cancel();

        if (selectedDrawingIdRef.current) {
          const selectionGesture = drawingSelectionGestureRef.current;

          if (selectionGesture?.kind === 'pinching' && pointersRef.current.size === 1) {
            const [remainingPointerId, remainingPoint] = [...pointersRef.current][0]!;
            drawingSelectionGestureRef.current = drawingSelectionGestureReducer(selectionGesture, {
              type: 'POINTER_UP_TO_ONE',
              remainingPointerId,
              remainingWorldPoint: toWorldPoint(cameraRef.current, remainingPoint),
            });
            setLiveDrawingDragOffset({ x: 0, y: 0 });
            return;
          }

          const dragStart = selectionGesture?.kind === 'dragging' ? selectionGesture : null;
          const offset = drawingDragOffsetRef.current;
          const pinchPreview = drawingPinchPreviewRef.current;
          const boxPinchPreview = drawingBoxPinchPreviewRef.current;
          drawingSelectionGestureRef.current = drawingSelectionGestureReducer(selectionGesture, {
            type: 'POINTER_UP_TO_ZERO',
          });
          setLiveDrawingDragOffset(null);
          setIsDrawingOverTrash(false);
          wasOverTrashRef.current = false;
          setIsDrawingDeleteArmed(false);
          setLiveDrawingPinchPreview(null);
          setLiveDrawingBoxPinchPreview(null);

          if (dragStart && dragStart.pointerId === e.pointerId && isOverTrash(e)) {
            if (isEditModeRef.current) {
              markDrawingDeletedRef.current(selectedDrawingIdRef.current);
            } else {
              deleteDrawingRef.current(selectedDrawingIdRef.current);
            }
            setSelectedDrawingId(null);
            setSelectedDrawingBaseSize(null);
            setSelectedDrawingBoxTransform(null);
            return;
          }

          const isMoved = !!(
            dragStart &&
            dragStart.pointerId === e.pointerId &&
            offset &&
            (offset.x !== 0 || offset.y !== 0)
          );
          const drawing = drawingsRef.current.find((d) => d.id === selectedDrawingIdRef.current);
          const basePoints = pinchPreview?.points ?? drawing?.points;
          const baseStrokeWidth = pinchPreview?.strokeWidth ?? drawing?.strokeWidth;

          if (drawing && basePoints && baseStrokeWidth !== undefined && (pinchPreview || isMoved)) {
            const finalPoints =
              isMoved && offset
                ? basePoints.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }))
                : basePoints;
            if (isEditModeRef.current) {
              applyDrawingChangeRef.current(drawing.id, {
                points: finalPoints,
                strokeWidth: baseStrokeWidth,
              });
            } else {
              moveDrawingRef.current(
                toDrawingMoveInput(drawing.id, finalPoints, {
                  color: drawing.color,
                  strokeWidth: baseStrokeWidth,
                  zIndex: drawing.zIndex,
                }),
              );
            }
          }

          // 선택 박스의 회전/배율/중심도 같이 확정해서, 다음 제스처가 이 값을 기준으로 이어지게 한다
          const baseBoxTransform = boxPinchPreview ?? selectedDrawingBoxTransformRef.current;
          if (baseBoxTransform && (boxPinchPreview || isMoved)) {
            const finalBoxTransform =
              isMoved && offset
                ? {
                    ...baseBoxTransform,
                    x: baseBoxTransform.x + offset.x,
                    y: baseBoxTransform.y + offset.y,
                  }
                : baseBoxTransform;
            selectedDrawingBoxTransformRef.current = finalBoxTransform;
            setSelectedDrawingBoxTransform(finalBoxTransform);
          }

          // 기본 모드는 이동 가능 상태 없이 롱프레스로만 들어오므로, 제스처가 끝나면
          // (휴지통에 놓지 않았어도) 선택을 유지하지 않고 매번 새로 롱프레스해야 한다
          if (!isEditModeRef.current) {
            setSelectedDrawingId(null);
            setSelectedDrawingBaseSize(null);
            setSelectedDrawingBoxTransform(null);
          }
          return;
        }
      }

      longPressRef.current.cancel();

      const gesture = gestureRef.current;

      if (pointersRef.current.size === 0) {
        // 마지막 손가락이 떨어짐 -> 커밋
        if (gesture?.kind === 'move' && gesture.pointerId === e.pointerId) {
          const scale = cameraRef.current.scale;
          const finalTransform: StickerTransform = {
            x: gesture.startTransform.x + (point.x - gesture.startClient.x) / scale,
            y: gesture.startTransform.y + (point.y - gesture.startClient.y) / scale,
            rotation: gesture.startTransform.rotation,
            scale: gesture.startTransform.scale,
          };
          setLiveTransform(null);

          if (gesture.sticker.id === EMPTY_BOARD_STICKER_ID) {
            setEmptyBoardStickerTransform(finalTransform);
            emptyBoardStickerRef.current = {
              ...emptyBoardStickerRef.current,
              posX: finalTransform.x,
              posY: finalTransform.y,
              rotation: finalTransform.rotation,
              scale: finalTransform.scale,
            };
          }

          // 실제로 아무것도 안 바뀌었으면(드래그 없이 탭만 한 경우) 저장 요청을 보내지 않는다
          const unchanged =
            finalTransform.x === gesture.sticker.posX &&
            finalTransform.y === gesture.sticker.posY &&
            finalTransform.rotation === gesture.sticker.rotation &&
            finalTransform.scale === gesture.sticker.scale;

          if (gesture.sticker.id !== EMPTY_BOARD_STICKER_ID && !unchanged) {
            const badgeOffset = scaleBadgeOffset(
              { x: gesture.sticker.badgeOffsetX, y: gesture.sticker.badgeOffsetY },
              finalTransform.scale,
              gesture.sticker.scale,
            );
            applyStickerChangeRef.current(gesture.sticker.id, {
              posX: finalTransform.x,
              posY: finalTransform.y,
              rotation: finalTransform.rotation,
              scale: finalTransform.scale,
              badgeOffsetX: badgeOffset.x,
              badgeOffsetY: badgeOffset.y,
            });
          }
        }
        gestureRef.current = gestureReducer(gestureRef.current, { type: 'POINTER_UP_TO_ZERO' });
      } else if (pointersRef.current.size === 1) {
        // 손가락 하나가 남음 -> 아직 커밋하지 않고 남은 손가락 기준으로 이어감
        const [remainingPointerId, remainingPoint] = [...pointersRef.current][0]!;

        gestureRef.current = gestureReducer(gestureRef.current, {
          type: 'POINTER_UP_TO_ONE',
          remainingPointerId,
          remainingPoint,
          camera: cameraRef.current,
          liveTransform: dragTransformRef.current,
        });
      }

      const tap = tapCandidateRef.current;
      if (tap?.pointerId === e.pointerId) {
        tapCandidateRef.current = null;

        if (!tap.stickerId) {
          // 빈 배경 탭 — 더블탭이면 줌을 1.0x로 복귀, 아니면 편집 모드에서 선택 해제
          const lastTap = lastBackgroundTapRef.current;
          const now = Date.now();
          const isDoubleTap =
            lastTap !== null &&
            now - lastTap.time < DOUBLE_TAP_MAX_INTERVAL_MS &&
            distance(lastTap.point, tap.startClient) < DOUBLE_TAP_MAX_DISTANCE;

          if (isDoubleTap) {
            lastBackgroundTapRef.current = null;
            setCamera((current) => zoomCameraTo(current, tap.startClient, 1));
          } else {
            lastBackgroundTapRef.current = { time: now, point: tap.startClient };
            if (isEditModeRef.current) setSelectedStickerId(null);
          }
        } else if (!isEditModeRef.current) {
          const stickerId = tap.stickerId;
          const openRecap = () => pushRef.current('Recap', { stickerId, boardId });
          void queryClient
            .ensureQueryData(stickerQueryOptions(stickerId))
            .then(openRecap, openRecap);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        const rect = container.getBoundingClientRect();
        const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setCamera((current) => zoomCamera(current, pointer, e.deltaY));
        return;
      }
      setCamera((current) => panCamera(current, { x: e.deltaX, y: e.deltaY }));
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
      releasePressedSticker();
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('gesturestart', blockGesture);
      container.removeEventListener('gesturechange', blockGesture);
      container.removeEventListener('gestureend', blockGesture);
    };
  }, [
    container,
    boardId,
    queryClient,
    quickMenu.isEditingRef,
    trashButtonRef,
    cameraRef,
    setCamera,
  ]);

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
  const activeDrawingBoxTransform = drawingBoxPinchPreview ?? selectedDrawingBoxTransform;
  const isEmptyBoardStickerVisible = stickers.length === 0 && !isEmptyStickerHidden;
  const activeEmptyBoardStickerTransform =
    dragTransform?.id === EMPTY_BOARD_STICKER_ID ? dragTransform : emptyBoardStickerTransform;
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
            const isDragging = isSelected && drawingDragOffset !== null;
            const pinchPreview = isSelected ? drawingPinchPreview : null;

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
                      ? `translate(${drawingDragOffset!.x}, ${drawingDragOffset!.y})`
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
          {selectedDrawingBaseSize && activeDrawingBoxTransform && (
            <SelectionBoxFrame
              x={activeDrawingBoxTransform.x + (drawingDragOffset?.x ?? 0)}
              y={activeDrawingBoxTransform.y + (drawingDragOffset?.y ?? 0)}
              width={selectedDrawingBaseSize.width * activeDrawingBoxTransform.scale}
              height={selectedDrawingBaseSize.height * activeDrawingBoxTransform.scale}
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
              transformOverride={dragTransform?.id === sticker.id ? dragTransform : undefined}
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
                dragTransform?.id === selectedSticker.id ? dragTransform : undefined
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
            onPointerDown={(event) => {
              event.preventDefault();
              quickMenu.finishDirectEditFromBackdrop();
            }}
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
