'use client';

import { useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { boardQueryKeys } from '@/entities/board/api/board-query-keys';
import { useBoardQuery } from '@/entities/board/api/board-queries';
import { bridge } from '@/shared/lib/bridge';
import { useLongPress } from '@/shared/lib/use-long-press';
import { useRefetchOnActive } from '@/shared/lib/use-refetch-on-active';

import {
  type CameraState,
  computeBoardPinchZoom,
  computeFocusTarget,
  panCamera,
  toWorldPoint,
  zoomCamera,
  zoomCameraTo,
} from '../model/board-camera';
import {
  type DrawGesture,
  type DrawGestureResult,
  drawGestureReducer,
} from '../model/board-draw-gesture';
import {
  type DrawingCreateInput,
  getDrawingBounds,
  hitTestDrawingId,
  parseStrokePoints,
  toDrawingCreateInput,
} from '../model/board-drawing';
import { type DragTransform, type Gesture, gestureReducer } from '../model/board-gesture';
import {
  computeBringToFrontZIndex,
  computeInitialLayout,
  type ExistingSticker,
  needsInitialLayout,
  toLayoutInput,
} from '../model/board-layout';
import {
  computeStickerPinchTransform,
  scaleBadgeOffset,
  type StickerTransform,
} from '../model/board-transform';
import { angleBetween, centroid, distance, type Point } from '../model/geometry';
import { useDeleteSticker } from '../model/use-delete-sticker';
import { useRegenerateSticker } from '../model/use-regenerate-sticker';
import { useStickerQuickMenu } from '../model/use-sticker-quick-menu';

import type { ToolbarMode } from './BoardToolbar';
import { DrawingStroke } from './DrawingStroke';
import {
  EmptyBoardSticker,
  EMPTY_BOARD_STICKER_DEFAULT_TITLE,
} from './empty-state/EmptyBoardSticker';
import { EmptyBoardStickerQuickMenu } from './empty-state/EmptyBoardStickerQuickMenu';
import { SelectBox } from './SelectBox';
import { SelectionBoxFrame } from './SelectionBoxFrame';
import { Sticker, type StickerData } from './Sticker';
import { StickerBadgeMark } from './StickerBadgeMark';
import { StickerPreview } from './StickerPreview';
import { StickerQuickMenu } from './StickerQuickMenu';

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
  // 카메라 줌 배율이 바뀔 때마다 호출
  onCameraScaleChange?: (scale: number) => void;
  // draw 모드에서 그림이 선택됐는지 여부가 바뀔 때마다 호출
  onDrawingSelectionChange?: (selected: boolean) => void;
};

export type BoardCanvasHandle = {
  // 가장 최근에 그린 선을 삭제한다
  undoLastStroke: () => void;
};

// 탭과 드래그를 구분하는 이동 허용 오차(px)
const TAP_MOVE_THRESHOLD = 6;
// 더블탭으로 인정하는 두 탭 사이의 최대 시간(ms), 위치 오차(px)
const DOUBLE_TAP_MAX_INTERVAL_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE = 24;
// 새 스티커 배치 후 카메라가 포커스로 이동하는 시간(ms)
const CAMERA_FOCUS_ANIMATION_MS = 350;
// 카메라 포커스 범위(AABB) 계산용 스티커 절반 크기 근사치. 실제 이미지 크기를 몰라서(로드해봐야
// 알 수 있음) Sticker.tsx의 STICKER_MAX_EDGE(160)의 절반으로 근사한다. 뱃지(제목)는 줌과 무관하게
// 고정 크기를 유지할 예정이라 이 범위 계산에는 포함하지 않는다.
const STICKER_FIT_HALF_SIZE = 80;

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

function hitTestStickerId(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest('[data-sticker-id]');
  return el instanceof HTMLElement ? (el.dataset.stickerId ?? null) : null;
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
    onCameraScaleChange,
    onDrawingSelectionChange,
  },
  ref,
) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<CameraState>({ scale: 1, x: 0, y: 0 });
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [dragTransform, setDragTransform] = useState<DragTransform | null>(null);
  // 그리는 도중인 선의 점들(보드 월드 좌표). 그리는 중이 아니면 null
  const [drawingPoints, setDrawingPoints] = useState<Point[] | null>(null);
  // draw 모드에서 롱프레스로 선택된 그림(삭제 대상). draw 모드에서만 의미 있음
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [isEmptyBoardQuickMenuOpen, setIsEmptyBoardQuickMenuOpen] = useState(false);
  const [emptyBoardStickerTitle, setEmptyBoardStickerTitle] = useState(
    EMPTY_BOARD_STICKER_DEFAULT_TITLE,
  );
  const { data, isLoading, isError, refetch, isStale } = useBoardQuery(boardId);
  const { mutate: saveLayout } = useUpdateBoardLayoutMutation();
  const { push } = useFlow();
  const queryClient = useQueryClient();
  const { regenerate, isRegenerating } = useRegenerateSticker(boardId);
  const { deleteSticker, isDeleting } = useDeleteSticker(boardId);
  const quickMenu = useStickerQuickMenu(boardId);
  const isEditMode = mode === 'move';
  const isDrawMode = mode === 'draw';
  // 편집 모드를 벗어나면 선택도 같이 해제된 것으로 취급
  const selectedId = isEditMode ? selectedStickerId : null;
  // draw 모드를 벗어나면 그림 선택도 같이 해제된 것으로 취급
  const activeSelectedDrawingId = isDrawMode ? selectedDrawingId : null;

  // 편집 모드를 벗어났다가 다시 들어와도 이전 선택이 되살아나지 않도록 상태 자체를 지움.
  // useEffect 대신 렌더 중 비교 후 setState하는 방식(React 공식 권장 패턴)으로 처리해 커밋 사이클을 하나 아낀다
  const [prevIsEditMode, setPrevIsEditMode] = useState(isEditMode);
  if (isEditMode !== prevIsEditMode) {
    setPrevIsEditMode(isEditMode);
    if (!isEditMode) setSelectedStickerId(null);
  }

  // draw 모드를 벗어났다가 다시 들어와도 이전 그림 선택이 되살아나지 않도록 상태 자체를 지움
  const [prevIsDrawMode, setPrevIsDrawMode] = useState(isDrawMode);
  if (isDrawMode !== prevIsDrawMode) {
    setPrevIsDrawMode(isDrawMode);
    if (!isDrawMode) setSelectedDrawingId(null);
  }

  const rawStickers = data?.stickers ?? [];
  // 새로 생성됐지만 좌표를 아직 안 정한 스티커(posX/posY/zIndex가 null) — 빈 공간 배치 대상
  const unplacedStickers = rawStickers.filter(needsInitialLayout);
  const placedStickers: ExistingSticker[] = rawStickers
    .filter((sticker) => !needsInitialLayout(sticker))
    .map((sticker) => ({ posX: sticker.posX!, posY: sticker.posY!, zIndex: sticker.zIndex! }));

  // 렌더링/제스처 쪽에는 항상 실제 좌표만 넘어가게, 아직 배치 전인 스티커는 배치 계산이
  // 끝나기 전까지만 임시로 0/1로 채워서 보여준다(배치 이펙트가 곧바로 실제 값으로 덮어씀)
  const stickers: StickerData[] = [...rawStickers]
    .map((sticker) => ({
      ...sticker,
      posX: sticker.posX ?? 0,
      posY: sticker.posY ?? 0,
      zIndex: sticker.zIndex ?? 0,
    }))
    .sort((a, b) => a.zIndex - b.zIndex);

  // 저장된 그림(전부 scope=BOARD, 스티커 귀속은 별도 이슈) — 렌더용으로 stroke에서 점 배열을 복원
  const drawings = (data?.drawings ?? []).map((drawing) => ({
    id: drawing.id,
    points: parseStrokePoints(drawing.stroke),
    color: drawing.color,
    strokeWidth: drawing.strokeWidth,
  }));

  const cameraRef = useRef(camera);
  const stickersRef = useRef(stickers);
  const selectedIdRef = useRef(selectedId);
  const selectedDrawingIdRef = useRef(activeSelectedDrawingId);
  const isEditModeRef = useRef(isEditMode);
  const isDrawModeRef = useRef(isDrawMode);
  const isPointerInputSuspendedRef = useRef(isPointerInputSuspended);
  const drawColorRef = useRef(drawColor);
  const drawStrokeWidthRef = useRef(drawStrokeWidth);
  const dragTransformRef = useRef<DragTransform | null>(null); // 제스처 도중의 실시간 위치/회전/크기
  const drawGestureRef = useRef<DrawGesture | null>(null); // draw 모드의 그리기/핀치줌 상태

  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);
  const tapCandidateRef = useRef<{
    pointerId: number;
    stickerId: string | null;
    startClient: Point;
  } | null>(null);
  // 더블탭 감지용 — 직전에 빈 배경을 탭한 시각·위치
  const lastBackgroundTapRef = useRef<{ time: number; point: Point } | null>(null);

  const longPress = useLongPress({
    onLongPress: (stickerId) => {
      quickMenu.openQuickMenu(stickerId);
      // 리캡 이동과 안 겹치게 탭 후보 제거
      tapCandidateRef.current = null;
    },
  });

  // draw 모드에서 기존 그림을 롱프레스하면 선택(삭제 대상)한다. 스티커 롱프레스와는
  // 완전히 별개 인스턴스 — draw 모드에서는 스티커 롱프레스 코드 경로 자체를 안 탄다
  const drawingLongPress = useLongPress({
    onLongPress: (drawingId) => setSelectedDrawingId(drawingId),
  });

  useRefetchOnActive(refetch, isStale);

  // 보드에 있는 동안만 웹뷰 네이티브 바운스 스크롤을 꺼서 캔버스 드래그와 안 겹치게 함
  useEffect(() => {
    bridge.send('SET_BOARD_ACTIVE', { active: true });
    return () => bridge.send('SET_BOARD_ACTIVE', { active: false });
  }, []);

  // 캐시에 변경분을 바로 반영하고 저장 요청을 보냄
  const saveStickerLayout = (
    sticker: StickerData,
    overrides: Partial<
      Pick<
        StickerData,
        'posX' | 'posY' | 'rotation' | 'scale' | 'badgeOffsetX' | 'badgeOffsetY' | 'zIndex'
      >
    >,
  ) => {
    const updated = { ...sticker, ...overrides };

    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current
        ? {
            ...current,
            stickers: current.stickers.map((s) =>
              s.id === sticker.id ? { ...s, ...overrides } : s,
            ),
          }
        : current,
    );

    saveLayout({
      boardId,
      input: toLayoutInput([
        {
          id: updated.id,
          posX: updated.posX ?? 0,
          posY: updated.posY ?? 0,
          rotation: updated.rotation,
          scale: updated.scale,
          zIndex: updated.zIndex ?? 0,
          badgeOffsetX: updated.badgeOffsetX,
          badgeOffsetY: updated.badgeOffsetY,
        },
      ]),
    });
  };

  // 스티커를 선택하면 다른 스티커 위로 보이도록 zIndex를 맨 위로 올림
  const selectSticker = (sticker: StickerData): StickerData => {
    setSelectedStickerId(sticker.id);
    const newZIndex = computeBringToFrontZIndex(
      stickersRef.current.map((s) => ({ id: s.id, zIndex: s.zIndex ?? 0 })),
      sticker.id,
    );
    if (newZIndex === null) return sticker;
    saveStickerLayout(sticker, { zIndex: newZIndex });
    return { ...sticker, zIndex: newZIndex };
  };

  // 새 그림을 캐시에 낙관적으로 반영하고 저장 요청을 보냄
  const saveDrawing = (input: DrawingCreateInput) => {
    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current ? { ...current, drawings: [...current.drawings, input] } : current,
    );

    saveLayout({ boardId, input: { drawings: { created: [input] } } });
  };

  // 그림을 캐시에서 낙관적으로 제거하고 삭제 요청을 보냄
  const deleteDrawing = (id: string) => {
    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current ? { ...current, drawings: current.drawings.filter((d) => d.id !== id) } : current,
    );

    saveLayout({ boardId, input: { drawings: { deletedIds: [id] } } });
  };

  const saveStickerLayoutRef = useRef(saveStickerLayout);
  const selectStickerRef = useRef(selectSticker);
  const saveDrawingRef = useRef(saveDrawing);
  const deleteDrawingRef = useRef(deleteDrawing);
  const drawingsRef = useRef(drawings);
  const pushRef = useRef(push);
  const longPressRef = useRef(longPress);
  const drawingLongPressRef = useRef(drawingLongPress);
  const onDrawingActiveChangeRef = useRef(onDrawingActiveChange);
  // 직전에 알려준 "그리는 중" 여부
  const isDrawingActiveRef = useRef(false);

  // ref들을 매 렌더 이후 최신값으로 동기화
  useEffect(() => {
    cameraRef.current = camera;
    stickersRef.current = stickers;
    selectedIdRef.current = selectedId;
    selectedDrawingIdRef.current = activeSelectedDrawingId;
    isEditModeRef.current = isEditMode;
    isDrawModeRef.current = isDrawMode;
    isPointerInputSuspendedRef.current = isPointerInputSuspended;
    drawColorRef.current = drawColor;
    drawStrokeWidthRef.current = drawStrokeWidth;
    saveStickerLayoutRef.current = saveStickerLayout;
    selectStickerRef.current = selectSticker;
    saveDrawingRef.current = saveDrawing;
    deleteDrawingRef.current = deleteDrawing;
    drawingsRef.current = drawings;
    pushRef.current = push;
    longPressRef.current = longPress;
    drawingLongPressRef.current = drawingLongPress;
    onDrawingActiveChangeRef.current = onDrawingActiveChange;
  });

  // 실행취소할 그림이 있는지 여부를 부모에 알림
  useEffect(() => {
    onCanUndoChange?.(drawings.length > 0);
  }, [drawings.length, onCanUndoChange]);

  useEffect(() => {
    onCameraScaleChange?.(camera.scale);
  }, [camera.scale, onCameraScaleChange]);

  // 그림 선택(삭제 대상) 여부를 부모에 알림 — 상단 UI 숨김/하단 삭제 바 전환에 사용
  useEffect(() => {
    onDrawingSelectionChange?.(activeSelectedDrawingId !== null);
  }, [activeSelectedDrawingId, onDrawingSelectionChange]);

  useImperativeHandle(
    ref,
    () => ({
      undoLastStroke: () => {
        const list = drawingsRef.current;
        if (list.length === 0) return;
        deleteDrawingRef.current(list[list.length - 1]!.id);
      },
    }),
    [],
  );

  // 배치 처리 시작한 스티커 id를 기억해서, 저장 응답이 캐시에 반영되기 전에 리렌더가 껴도
  // 같은 스티커를 다시 계산·저장하지 않게 막는다
  const handledPlacementRef = useRef(new Set<string>());
  const cameraFocusFrameRef = useRef<number | null>(null);
  // 새로 배치된 무리를 카메라로 포커스해달라는 요청. 배치 계산과 분리된 별도 상태로 둬서,
  // 이 상태를 구독하는 애니메이션 이펙트가 배치 이펙트의 재실행(캐시 갱신 등으로 인한)에
  // 휘말려 애니메이션이 중간에 취소되지 않게 한다.
  const [focusRequest, setFocusRequest] = useState<{
    targets: Point[];
    viewport: { width: number; height: number };
  } | null>(null);

  // 새로 생성돼 좌표가 없는 스티커를 빈 공간에 배치하고 저장한다
  useEffect(() => {
    if (!container) return;

    const pending = unplacedStickers.filter(
      (sticker) => !handledPlacementRef.current.has(sticker.id),
    );
    if (pending.length === 0) return;
    pending.forEach((sticker) => handledPlacementRef.current.add(sticker.id));

    const rect = container.getBoundingClientRect();
    const viewport = { width: rect.width, height: rect.height };
    const laidOut = computeInitialLayout(pending, placedStickers, viewport);

    queryClient.setQueryData(boardQueryKeys.detail(boardId), (current: BoardDetail | undefined) =>
      current
        ? {
            ...current,
            stickers: current.stickers.map((sticker) => {
              const placement = laidOut.find((laid) => laid.id === sticker.id);
              return placement ? { ...sticker, ...placement } : sticker;
            }),
          }
        : current,
    );

    saveLayout({ boardId, input: toLayoutInput(laidOut) });

    // 카메라 포커스는 AABB를 계산하므로, 스티커 중심점이 아니라 대략적인 외곽 두 지점을 넘긴다
    const targets = laidOut.flatMap((sticker) => [
      { x: sticker.posX - STICKER_FIT_HALF_SIZE, y: sticker.posY - STICKER_FIT_HALF_SIZE },
      { x: sticker.posX + STICKER_FIT_HALF_SIZE, y: sticker.posY + STICKER_FIT_HALF_SIZE },
    ]);
    if (placedStickers.length === 0) {
      // 최초 배치에는 카메라 애니메이션 없이 바로 포커스 위치로 세팅한다
      setCamera((current) => computeFocusTarget(current, targets, viewport));
    } else {
      setFocusRequest({ targets, viewport });
    }
    // unplacedStickers/placedStickers는 data에서 매 렌더 새로 파생되므로 의도적으로 deps에서 제외.
    // data 참조가 실제로 바뀔 때만(우리 자신의 setQueryData 포함) 재실행되면 되고, handledPlacementRef가
    // 중복 처리를 막아준다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container, data, boardId, queryClient, saveLayout]);

  // 포커스 요청이 들어오면 그 무리의 중심으로 카메라를 부드럽게 이동시킨다.
  // focusRequest는 위 배치 이펙트가 새 무리를 배치했을 때만 바뀌므로, 배치 이펙트의 잦은
  // 재실행과 무관하게 애니메이션이 끝까지 방해받지 않고 진행된다.
  useEffect(() => {
    if (!focusRequest) return;

    const startCamera = cameraRef.current;
    const targetCamera = computeFocusTarget(
      startCamera,
      focusRequest.targets,
      focusRequest.viewport,
    );
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / CAMERA_FOCUS_ANIMATION_MS, 1);
      const eased = easeOutCubic(progress);
      setCamera({
        scale: startCamera.scale + (targetCamera.scale - startCamera.scale) * eased,
        x: startCamera.x + (targetCamera.x - startCamera.x) * eased,
        y: startCamera.y + (targetCamera.y - startCamera.y) * eased,
      });
      if (progress < 1) {
        cameraFocusFrameRef.current = requestAnimationFrame(animate);
      }
    };
    cameraFocusFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (cameraFocusFrameRef.current !== null) cancelAnimationFrame(cameraFocusFrameRef.current);
    };
  }, [focusRequest]);

  // 포인터, 휠 제스처는 Konva 없이 순수 DOM 이벤트로 직접 처리
  // pointerdown은 컨테이너에, move/up/cancel은 window에 붙여서 손가락이 컨테이너 밖으로 나가도(빠르게 드래그할 때 흔함) 계속 추적되게 함
  useEffect(() => {
    if (!container) return;

    const getLocalPoint = (e: PointerEvent): Point => {
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const setLiveTransform = (next: DragTransform | null) => {
      dragTransformRef.current = next;
      setDragTransform(next);
    };

    // drawGestureReducer 결과를 실제 상태(refs/state)에 반영하고, 완성된 선이 있으면 저장한다
    const applyDrawGestureResult = (result: DrawGestureResult) => {
      drawGestureRef.current = result.state;
      setDrawingPoints(result.state?.kind === 'drawing' ? result.state.points : null);

      // 그리는 중(drawing/pinching) 여부가 실제로 바뀔 때만 부모에 알림
      const isActive = result.state !== null;
      if (isActive !== isDrawingActiveRef.current) {
        isDrawingActiveRef.current = isActive;
        onDrawingActiveChangeRef.current?.(isActive);
      }

      if (result.finalizedStroke && result.finalizedStroke.length > 0) {
        saveDrawingRef.current(
          toDrawingCreateInput(result.finalizedStroke, {
            color: drawColorRef.current,
            strokeWidth: drawStrokeWidthRef.current,
          }),
        );
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (isPointerInputSuspendedRef.current) return;
      // 퀵메뉴/이름 직접 편집 중엔 캔버스 제스처 비활성화
      if (quickMenu.isEditingRef.current) return;
      const point = getLocalPoint(e);
      pointersRef.current.set(e.pointerId, point);

      if (isDrawModeRef.current) {
        if (pointersRef.current.size === 1) {
          const worldPoint = toWorldPoint(cameraRef.current, point);

          if (selectedDrawingIdRef.current) {
            // 선택된 그림이 있는 동안의 드래그(삭제) 처리는 다음 단계에서 구현 —
            // 지금은 선택된 그림 바깥을 탭하면 선택만 해제한다
            if (
              hitTestDrawingId(worldPoint, drawingsRef.current) !== selectedDrawingIdRef.current
            ) {
              setSelectedDrawingId(null);
            }
            return;
          }

          const hitDrawingId = hitTestDrawingId(worldPoint, drawingsRef.current);
          if (hitDrawingId) {
            // 기존 그림을 롱프레스로 선택하는 중엔 그리기를 시작하지 않는다
            drawingLongPressRef.current.start(point, hitDrawingId);
            return;
          }

          applyDrawGestureResult(
            drawGestureReducer(drawGestureRef.current, {
              type: 'POINTER_DOWN',
              pointerId: e.pointerId,
              point: worldPoint,
            }),
          );
        } else if (pointersRef.current.size === 2) {
          drawingLongPressRef.current.cancel();
          const points = [...pointersRef.current.values()];
          applyDrawGestureResult(
            drawGestureReducer(drawGestureRef.current, {
              type: 'MULTI_TOUCH',
              points: [points[0]!, points[1]!],
              camera: cameraRef.current,
            }),
          );
        }
        return;
      }

      if (pointersRef.current.size !== 1) return;

      const stickerId = hitTestStickerId(e.target);
      tapCandidateRef.current = { pointerId: e.pointerId, stickerId, startClient: point };

      // 편집 모드에선 pointerdown이 바로 드래그로 이어지므로 롱프레스는 기본 뷰 모드에서만
      if (stickerId && !isEditModeRef.current) {
        longPressRef.current.start(point, stickerId);
      }

      // 스티커를 처음 선택하는 순간이면 맨 위로 올리는 부수효과를 먼저 실행하고,
      // 그 결과(갱신된 zIndex)를 반영한 스티커를 reducer에 넘긴다 (편집 모드에서만 선택/저장 부수효과 발생)
      const found =
        stickerId && isEditModeRef.current
          ? stickersRef.current.find((s) => s.id === stickerId)
          : undefined;
      const stickerHit = found
        ? selectedIdRef.current !== stickerId
          ? selectStickerRef.current(found)
          : found
        : null;

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
        if (pointersRef.current.size >= 2) {
          drawingLongPressRef.current.cancel();
          const gesture = drawGestureRef.current;
          if (gesture?.kind !== 'pinching') return;
          const points = [...pointersRef.current.values()];
          setCamera(
            computeBoardPinchZoom(
              gesture.startCamera,
              { centroid: gesture.startCentroid, distance: gesture.startDistance },
              { centroid: centroid(points), distance: distance(points[0]!, points[1]!) },
            ),
          );
          return;
        }

        if (selectedDrawingIdRef.current) {
          // 선택된 그림 드래그(삭제)는 다음 단계에서 구현
          return;
        }

        // 손가락이 여유 거리 이상 움직이면 롱프레스가 아니라 그리려는 의도로 보고 취소한다
        drawingLongPressRef.current.move(point);

        applyDrawGestureResult(
          drawGestureReducer(drawGestureRef.current, {
            type: 'POINTER_MOVE',
            pointerId: e.pointerId,
            point: toWorldPoint(cameraRef.current, point),
          }),
        );
        return;
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
        // 손을 뗐는데 롱프레스 타이머가 아직 안 끝났으면(=탭이었으면) 취소 —
        // 안 그러면 손을 뗀 뒤에도 타이머가 계속 돌다가 뒤늦게 선택돼버린다
        drawingLongPressRef.current.cancel();

        if (selectedDrawingIdRef.current) return;

        if (pointersRef.current.size === 0) {
          // 드래그 없이 탭만 해도 점 하나(찍은 점)로 저장한다
          applyDrawGestureResult(
            drawGestureReducer(drawGestureRef.current, { type: 'POINTER_UP_TO_ZERO' }),
          );
        } else if (pointersRef.current.size === 1) {
          // 핀치줌 중 손가락 하나가 떨어짐 -> 종료 (남은 손가락으로 이어서 그리진 않음)
          applyDrawGestureResult(
            drawGestureReducer(drawGestureRef.current, { type: 'POINTER_UP_TO_ONE' }),
          );
        }
        return;
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

          // 실제로 아무것도 안 바뀌었으면(드래그 없이 탭만 한 경우) 저장 요청을 보내지 않는다
          const unchanged =
            finalTransform.x === gesture.sticker.posX &&
            finalTransform.y === gesture.sticker.posY &&
            finalTransform.rotation === gesture.sticker.rotation &&
            finalTransform.scale === gesture.sticker.scale;

          if (!unchanged) {
            const badgeOffset = scaleBadgeOffset(
              { x: gesture.sticker.badgeOffsetX, y: gesture.sticker.badgeOffsetY },
              finalTransform.scale,
              gesture.sticker.scale,
            );
            saveStickerLayoutRef.current(gesture.sticker, {
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
          pushRef.current('Recap', { stickerId: tap.stickerId, boardId });
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
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('gesturestart', blockGesture);
      container.removeEventListener('gesturechange', blockGesture);
      container.removeEventListener('gestureend', blockGesture);
    };
  }, [container, boardId, quickMenu.isEditingRef]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오는 중이에요</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-body-04 text-gray-400">보드를 불러오지 못했어요</p>
      </div>
    );
  }

  const selectedSticker = stickers.find((sticker) => sticker.id === selectedId);
  const quickMenuSticker = stickers.find((sticker) => sticker.id === quickMenu.quickMenuStickerId);
  const directEditSticker = stickers.find(
    (sticker) => sticker.id === quickMenu.directEditStickerId,
  );
  const selectedDrawing = drawings.find((drawing) => drawing.id === activeSelectedDrawingId);
  const selectedDrawingBounds = selectedDrawing
    ? getDrawingBounds(selectedDrawing.points, selectedDrawing.strokeWidth)
    : null;

  return (
    <div
      ref={setContainer}
      className="relative h-full w-full touch-none overflow-hidden"
      style={{
        backgroundColor: '#000',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)',
        backgroundSize: `${18 * camera.scale}px ${18 * camera.scale}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
      }}
    >
      {stickers.length === 0 && (
        <EmptyBoardSticker
          title={emptyBoardStickerTitle}
          isQuickMenuOpen={isEmptyBoardQuickMenuOpen}
          onLongPress={() => setIsEmptyBoardQuickMenuOpen(true)}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '0 0',
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
        }}
      >
        {/* 저장된 그림 + 그리는 도중인 선의 실시간 미리보기 */}
        <svg style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
          {drawings.map((drawing) => (
            <DrawingStroke
              key={drawing.id}
              points={drawing.points}
              color={drawing.color}
              strokeWidth={drawing.strokeWidth}
            />
          ))}
          {drawingPoints && (
            <DrawingStroke points={drawingPoints} color={drawColor} strokeWidth={drawStrokeWidth} />
          )}
        </svg>
        {selectedDrawingBounds && (
          <SelectionBoxFrame
            x={selectedDrawingBounds.x}
            y={selectedDrawingBounds.y}
            width={selectedDrawingBounds.width}
            height={selectedDrawingBounds.height}
            zIndex={9999}
          />
        )}
        {stickers.map((sticker) => (
          <Sticker
            key={sticker.id}
            sticker={sticker}
            selected={selectedId === sticker.id}
            transformOverride={dragTransform?.id === sticker.id ? dragTransform : undefined}
          />
        ))}
        {stickers
          .filter((sticker) => sticker.id !== selectedId)
          .map((sticker) => (
            <StickerBadgeMark
              key={sticker.id}
              sticker={sticker}
              onNameClick={() => quickMenu.startDirectEdit(sticker.id)}
            />
          ))}
        {selectedSticker && (
          <SelectBox
            sticker={selectedSticker}
            transformOverride={dragTransform?.id === selectedSticker.id ? dragTransform : undefined}
          />
        )}
      </div>
      {directEditSticker && (
        <>
          <div
            aria-hidden
            className="modal-overlay fixed inset-0 z-50 backdrop-blur-[30px]"
            onClick={quickMenu.cancelDirectEdit}
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
        onRename={quickMenu.startRename}
        isEditingTitle={quickMenu.isRenamingTitle}
        onSubmitTitle={quickMenu.submitRename}
        onCancelEditTitle={quickMenu.cancelRename}
        titleInputRef={quickMenu.titleInputRef}
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
      />
    </div>
  );
});
