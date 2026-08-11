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
  panCamera,
  toWorldPoint,
  zoomCamera,
  zoomCameraTo,
} from '../model/board-camera';
import { computeBringToFrontZIndex, toLayoutInput } from '../model/board-layout';
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

type DragTransform = { id: string } & StickerTransform;

type Gesture =
  | { kind: 'pan'; pointerId: number; startClient: Point; startCamera: CameraState }
  | {
      kind: 'move';
      pointerId: number;
      sticker: StickerData;
      startClient: Point;
      startTransform: StickerTransform;
    }
  | { kind: 'pinch'; startCentroid: Point; startDistance: number; startCamera: CameraState }
  | {
      kind: 'stickerPinch';
      sticker: StickerData;
      startCentroid: Point;
      startDistance: number;
      startAngle: number;
      startTransform: StickerTransform;
    };

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

  const stickers: StickerData[] = data
    ? [...data.stickers].sort((a, b) => a.zIndex - b.zIndex)
    : [];

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

      if (stickerId && isEditModeRef.current) {
        const found = stickersRef.current.find((s) => s.id === stickerId);
        if (found) {
          const sticker =
            selectedIdRef.current !== stickerId ? selectStickerRef.current(found) : found;
          gestureRef.current = {
            kind: 'move',
            pointerId: e.pointerId,
            sticker,
            startClient: point,
            startTransform: {
              x: sticker.posX,
              y: sticker.posY,
              rotation: sticker.rotation,
              scale: sticker.scale,
            },
          };
          return;
        }
      }

      gestureRef.current = {
        kind: 'pan',
        pointerId: e.pointerId,
        startClient: point,
        startCamera: cameraRef.current,
      };
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

        // 배경을 팬하던 중이면 보드 핀치줌으로, 스티커를 이동하던 중이면 스티커 회전+확대로 전환(rebase)
        if (gesture.kind === 'pan') {
          gestureRef.current = {
            kind: 'pinch',
            startCentroid: centroid(points),
            startDistance: distance(points[0]!, points[1]!),
            startCamera: cameraRef.current,
          };
        } else if (gesture.kind === 'move') {
          const base =
            dragTransformRef.current?.id === gesture.sticker.id
              ? {
                  x: dragTransformRef.current.x,
                  y: dragTransformRef.current.y,
                  rotation: dragTransformRef.current.rotation,
                  scale: dragTransformRef.current.scale,
                }
              : gesture.startTransform;
          gestureRef.current = {
            kind: 'stickerPinch',
            sticker: gesture.sticker,
            startCentroid: toWorldPoint(cameraRef.current, centroid(points)),
            startDistance: distance(points[0]!, points[1]!),
            startAngle: angleBetween(points[0]!, points[1]!),
            startTransform: base,
          };
        }

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
        gestureRef.current = null;
      } else if (pointersRef.current.size === 1) {
        // 손가락 하나가 남음 -> 아직 커밋하지 않고 남은 손가락 기준으로 이어감
        const [remainingPointerId, remainingPoint] = [...pointersRef.current][0]!;

        if (gesture?.kind === 'pinch') {
          gestureRef.current = {
            kind: 'pan',
            pointerId: remainingPointerId,
            startClient: remainingPoint,
            startCamera: cameraRef.current,
          };
        } else if (gesture?.kind === 'stickerPinch') {
          const live =
            dragTransformRef.current?.id === gesture.sticker.id
              ? {
                  x: dragTransformRef.current.x,
                  y: dragTransformRef.current.y,
                  rotation: dragTransformRef.current.rotation,
                  scale: dragTransformRef.current.scale,
                }
              : gesture.startTransform;
          gestureRef.current = {
            kind: 'move',
            pointerId: remainingPointerId,
            sticker: gesture.sticker,
            startClient: remainingPoint,
            startTransform: live,
          };
        }
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
          pushRef.current('Recap', { stickerId: tap.stickerId });
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
  }, [container]);

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
    <div ref={setContainer} className="relative h-full w-full touch-none overflow-hidden">
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
