import type { useFlow } from '@stackflow/react';
import type { QueryClient } from '@tanstack/react-query';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

import { stickerQueryOptions } from '@/entities/sticker/api/sticker-queries';
import { bridge } from '@/shared/lib/bridge';
import { useLongPress } from '@/shared/lib/use-long-press';

import { EMPTY_BOARD_STICKER_ID } from '../ui/empty-state/EmptyBoardSticker';
import type { StickerData } from '../ui/Sticker';

import {
  type CameraState,
  computeBoardPinchZoom,
  panCamera,
  toWorldPoint,
  zoomCamera,
  zoomCameraTo,
} from './board-camera';
import { type DragTransform, type Gesture, gestureReducer } from './board-gesture';
import { computeBringToFrontZIndex } from './board-layout';
import {
  computeStickerPinchTransform,
  scaleBadgeOffset,
  type StickerTransform,
} from './board-transform';
import { angleBetween, centroid, distance, type Point } from './geometry';

type StickerOverride = Partial<
  Pick<
    StickerData,
    'posX' | 'posY' | 'rotation' | 'scale' | 'badgeOffsetX' | 'badgeOffsetY' | 'zIndex'
  >
>;

// 탭과 드래그를 구분하는 이동 허용 오차(px)
const TAP_MOVE_THRESHOLD = 6;
// 더블탭으로 인정하는 두 탭 사이의 최대 시간(ms), 위치 오차(px)
const DOUBLE_TAP_MAX_INTERVAL_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE = 24;

type UseCameraStickerGestureParams = {
  boardId: string;
  isEditMode: boolean;
  cameraRef: RefObject<CameraState>;
  setCamera: Dispatch<SetStateAction<CameraState>>;
  pointersRef: RefObject<Map<number, Point>>;
  stickersRef: RefObject<StickerData[]>;
  selectedId: string | null;
  emptyBoardSticker: StickerData;
  hitTestSticker: (target: EventTarget | null) => HTMLElement | null;
  // 스티커의 zIndex와 그림의 zIndex는 같은 숫자 공간을 공유한다 — 스티커를 선택해도 그 풀 기준으로 맨 위에 와야 한다
  combinedZIndexPool: () => { id: string; zIndex: number }[];
  setSelectedStickerId: Dispatch<SetStateAction<string | null>>;
  applyStickerChange: (stickerId: string, overrides: StickerOverride) => void;
  setEmptyBoardStickerTransform: Dispatch<SetStateAction<StickerTransform>>;
  push: ReturnType<typeof useFlow>['push'];
  queryClient: QueryClient;
  quickMenuStickerId: string | null;
  openQuickMenu: (stickerId: string) => void;
  // 손가락이 1개가 아니게 됐을 때 그림 선택 쪽 롱프레스도 방어적으로 취소해야 해서(두 훅이 각자
  // 자기 롱프레스만 알기 때문에) 호출자가 넘겨준다
  cancelDrawingLongPress: () => void;
};

// 배경 팬/핀치줌, 스티커 이동/회전+확대, 탭(리캡 이동)·더블탭(줌 리셋)·롱프레스(퀵메뉴)를
// 전부 담당한다. 그리기 모드나 그림 선택이 이벤트를 가져가지 않았을 때 항상 마지막에 호출되는
// 폴백이라, drawing-selection과 달리 소비 여부를 반환할 필요가 없다.
export function useCameraStickerGesture({
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
  queryClient,
  quickMenuStickerId,
  openQuickMenu,
  cancelDrawingLongPress,
}: UseCameraStickerGestureParams) {
  const [dragTransform, setDragTransformState] = useState<DragTransform | null>(null);

  const gestureRef = useRef<Gesture | null>(null);
  const dragTransformRef = useRef<DragTransform | null>(null);
  const selectedIdRef = useRef(selectedId);
  const emptyBoardStickerRef = useRef(emptyBoardSticker);
  const tapCandidateRef = useRef<{
    pointerId: number;
    stickerId: string | null;
    startClient: Point;
  } | null>(null);
  // 더블탭 감지용 — 직전에 빈 배경을 탭한 시각·위치
  const lastBackgroundTapRef = useRef<{ time: number; point: Point } | null>(null);
  const pressedStickerRef = useRef<HTMLElement | null>(null);
  // 롱프레스가 성사된 순간부터 퀵메뉴가 닫힐 때까지 눌린 연출을 잠근다. 이 사이에
  // 포인터 업·취소 등 여러 경로가 clearPressedSticker를 부르는데, 그걸 그대로 두면
  // 메뉴가 뜨기도 전에 스티커가 원래 크기로 줄어드는 게 보인다
  const isPressedStickerLockedRef = useRef(false);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    emptyBoardStickerRef.current = emptyBoardSticker;
  });

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
    if (quickMenuStickerId === null) releasePressedSticker();
  }, [quickMenuStickerId]);

  const longPress = useLongPress({
    onLongPress: (stickerId) => {
      isPressedStickerLockedRef.current = true;
      bridge.send('HAPTIC', { type: 'heavy' });
      openQuickMenu(stickerId);
      // 리캡 이동과 안 겹치게 탭 후보 제거
      tapCandidateRef.current = null;
    },
    onPressEnd: clearPressedSticker,
  });

  const setLiveTransform = (next: DragTransform | null) => {
    dragTransformRef.current = next;
    setDragTransformState(next);
  };

  // 스티커를 선택하면 스티커+그림 통틀어 맨 위로 보이도록 zIndex를 올림(세션 로컬 변경분)
  const selectSticker = (sticker: StickerData): StickerData => {
    setSelectedStickerId(sticker.id);
    const newZIndex = computeBringToFrontZIndex(combinedZIndexPool(), sticker.id);
    if (newZIndex === null) return sticker;
    applyStickerChange(sticker.id, { zIndex: newZIndex });
    return { ...sticker, zIndex: newZIndex };
  };

  const onPointerDown = (e: PointerEvent, point: Point) => {
    if (pointersRef.current.size !== 1) {
      tapCandidateRef.current = null;
      longPress.cancel();
      cancelDrawingLongPress();
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
    if (stickerId && stickerElement && !isEmptyBoardSticker && !isEditMode) {
      releasePressedSticker();
      longPress.start(point, stickerId);
      stickerElement.dataset.pressed = 'true';
      pressedStickerRef.current = stickerElement;
    }

    // 스티커를 처음 선택하는 순간이면 맨 위로 올리는 부수효과를 먼저 실행하고,
    // 그 결과(갱신된 zIndex)를 반영한 스티커를 reducer에 넘긴다 (편집 모드에서만 선택/저장 부수효과 발생)
    const found =
      stickerId && isEditMode
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
        stickerHit = selectedIdRef.current !== stickerId ? selectSticker(found) : found;
      }
    }

    gestureRef.current = gestureReducer(gestureRef.current, {
      type: 'POINTER_DOWN',
      pointerId: e.pointerId,
      point,
      camera: cameraRef.current,
      stickerHit,
      isEditMode,
    });
  };

  const onPointerMove = (e: PointerEvent, point: Point) => {
    if (tapCandidateRef.current?.pointerId === e.pointerId) {
      if (distance(tapCandidateRef.current.startClient, point) > TAP_MOVE_THRESHOLD) {
        tapCandidateRef.current = null;
      }
    }

    longPress.move(point);

    const gesture = gestureRef.current;
    if (!gesture) return;

    if (pointersRef.current.size >= 2) {
      // 두 손가락이 됐으면 탭일 수 없음
      tapCandidateRef.current = null;
      longPress.cancel();

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

  const onPointerUp = (e: PointerEvent, point: Point) => {
    longPress.cancel();

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
          applyStickerChange(gesture.sticker.id, {
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
          if (isEditMode) setSelectedStickerId(null);
        }
      } else if (!isEditMode) {
        const stickerId = tap.stickerId;
        const openRecap = () => push('Recap', { stickerId, boardId });
        void queryClient.ensureQueryData(stickerQueryOptions(stickerId)).then(openRecap, openRecap);
      }
    }
  };

  const onWheel = (e: WheelEvent, container: HTMLDivElement) => {
    e.preventDefault();
    if (e.ctrlKey) {
      const rect = container.getBoundingClientRect();
      const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setCamera((current) => zoomCamera(current, pointer, e.deltaY));
      return;
    }
    setCamera((current) => panCamera(current, { x: e.deltaX, y: e.deltaY }));
  };

  return {
    dragTransform,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    releasePressedSticker,
  };
}
