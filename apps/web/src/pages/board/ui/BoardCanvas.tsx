'use client';

import { useFlow } from '@stackflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

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

import type { ToolbarMode } from './BoardToolbar';
import { SelectBox } from './SelectBox';
import { Sticker, type StickerData } from './Sticker';
import { StickerBadgeMark } from './StickerBadgeMark';
import { StickerPreview } from './StickerPreview';
import { StickerQuickMenu } from './StickerQuickMenu';

type BoardCanvasProps = {
  boardId: string;
  mode: ToolbarMode;
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

export function BoardCanvas({ boardId, mode }: BoardCanvasProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<CameraState>({ scale: 1, x: 0, y: 0 });
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [dragTransform, setDragTransform] = useState<DragTransform | null>(null);
  const [quickMenuStickerId, setQuickMenuStickerId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch, isStale } = useBoardQuery(boardId);
  const { mutate: saveLayout } = useUpdateBoardLayoutMutation();
  const { push } = useFlow();
  const queryClient = useQueryClient();
  const { regenerate, isRegenerating } = useRegenerateSticker(boardId);
  const { deleteSticker, isDeleting } = useDeleteSticker(boardId);
  const isEditMode = mode === 'move';
  // 편집 모드를 벗어나면 선택도 같이 해제된 것으로 취급
  const selectedId = isEditMode ? selectedStickerId : null;

  // 편집 모드를 벗어났다가 다시 들어와도 이전 선택이 되살아나지 않도록 상태 자체를 지움.
  // useEffect 대신 렌더 중 비교 후 setState하는 방식(React 공식 권장 패턴)으로 처리해 커밋 사이클을 하나 아낀다
  const [prevIsEditMode, setPrevIsEditMode] = useState(isEditMode);
  if (isEditMode !== prevIsEditMode) {
    setPrevIsEditMode(isEditMode);
    if (!isEditMode) setSelectedStickerId(null);
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

  const cameraRef = useRef(camera);
  const stickersRef = useRef(stickers);
  const selectedIdRef = useRef(selectedId);
  const isEditModeRef = useRef(isEditMode);
  const dragTransformRef = useRef<DragTransform | null>(null); // 제스처 도중의 실시간 위치/회전/크기

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
      setQuickMenuStickerId(stickerId);
      // 리캡 이동과 안 겹치게 탭 후보 제거
      tapCandidateRef.current = null;
    },
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
          posX: updated.posX,
          posY: updated.posY,
          rotation: updated.rotation,
          scale: updated.scale,
          zIndex: updated.zIndex,
          badgeOffsetX: updated.badgeOffsetX,
          badgeOffsetY: updated.badgeOffsetY,
        },
      ]),
    });
  };

  // 스티커를 선택하면 다른 스티커 위로 보이도록 zIndex를 맨 위로 올림
  const selectSticker = (sticker: StickerData): StickerData => {
    setSelectedStickerId(sticker.id);
    const newZIndex = computeBringToFrontZIndex(stickersRef.current, sticker.id);
    if (newZIndex === null) return sticker;
    saveStickerLayout(sticker, { zIndex: newZIndex });
    return { ...sticker, zIndex: newZIndex };
  };

  const saveStickerLayoutRef = useRef(saveStickerLayout);
  const selectStickerRef = useRef(selectSticker);
  const pushRef = useRef(push);
  const longPressRef = useRef(longPress);

  // ref들을 매 렌더 이후 최신값으로 동기화
  useEffect(() => {
    cameraRef.current = camera;
    stickersRef.current = stickers;
    selectedIdRef.current = selectedId;
    isEditModeRef.current = isEditMode;
    saveStickerLayoutRef.current = saveStickerLayout;
    selectStickerRef.current = selectSticker;
    pushRef.current = push;
    longPressRef.current = longPress;
  });

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

    const handlePointerDown = (e: PointerEvent) => {
      const point = getLocalPoint(e);
      pointersRef.current.set(e.pointerId, point);
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
  }, [container, boardId]);

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
  const quickMenuSticker = stickers.find((sticker) => sticker.id === quickMenuStickerId);

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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '0 0',
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
        }}
      >
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
            <StickerBadgeMark key={sticker.id} sticker={sticker} />
          ))}
        {selectedSticker && (
          <SelectBox
            sticker={selectedSticker}
            transformOverride={dragTransform?.id === selectedSticker.id ? dragTransform : undefined}
          />
        )}
      </div>
      {quickMenuSticker && <StickerPreview sticker={quickMenuSticker} />}
      <StickerQuickMenu
        stickerTitle={quickMenuSticker?.title ?? ''}
        isOpen={quickMenuStickerId !== null}
        onClose={() => setQuickMenuStickerId(null)}
        onRegenerate={() => {
          if (quickMenuStickerId) regenerate(quickMenuStickerId, () => setQuickMenuStickerId(null));
        }}
        isRegenerating={isRegenerating}
        onDelete={() => {
          if (quickMenuStickerId)
            deleteSticker(quickMenuStickerId, () => setQuickMenuStickerId(null));
        }}
        isDeleting={isDeleting}
      />
    </div>
  );
}
