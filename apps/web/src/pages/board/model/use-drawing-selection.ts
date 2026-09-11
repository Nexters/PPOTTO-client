import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { bridge } from '@/shared/lib/bridge';
import { useLongPress } from '@/shared/lib/use-long-press';

import { type CameraState, toWorldPoint } from './board-camera';
import {
  computeDrawingBoxPinchTransform,
  composeDrawingTransform,
  transformDrawingPoint,
  type DrawingBoxTransform,
  type DrawingCreateInput,
  getDrawingBounds,
  hitTestDrawingId,
  isPointInDrawingBounds,
  type ParsedDrawing,
  toDrawingMoveInput,
} from './board-drawing';
import {
  type DrawingSelectionGesture,
  drawingSelectionGestureReducer,
} from './board-drawing-selection';
import { computeBringToFrontZIndex } from './board-layout';
import type { PinchSample } from './board-transform';
import { angleBetween, centroid, distance, type Point } from './geometry';

type DrawingOverride = Partial<Pick<ParsedDrawing, 'points' | 'strokeWidth' | 'zIndex'>>;

type UseDrawingSelectionParams = {
  isEditMode: boolean;
  cameraRef: RefObject<CameraState>;
  pointersRef: RefObject<Map<number, Point>>;
  drawingsRef: RefObject<ParsedDrawing[]>;
  trashButtonRef?: RefObject<HTMLButtonElement | null>;
  hitTestSticker: (target: EventTarget | null) => HTMLElement | null;
  // 스티커의 zIndex와 그림의 zIndex는 같은 숫자 공간을 공유한다 — 그림을 선택해도 그 풀 기준으로 맨 위에 와야 한다
  combinedZIndexPool: () => { id: string; zIndex: number }[];
  // 그림을 선택하면 스티커, 텍스트 선택은 해제해야 한다(교차 시스템 부수효과)
  setSelectedStickerId: Dispatch<SetStateAction<string | null>>;
  resetTextSelection: () => void;
  applyDrawingChange: (drawingId: string, overrides: DrawingOverride) => void;
  markDrawingDeleted: (drawingId: string) => void;
  moveDrawing: (input: DrawingCreateInput) => void;
  deleteDrawing: (id: string) => void;
  onDrawingDeleteArmedChange?: (isArmed: boolean) => void;
  onDrawingDragOverTrashChange?: (isOver: boolean) => void;
};

// 그림 선택·드래그·두 손가락 회전+확대·롱프레스 삭제승격·휴지통 드롭을 전부 담당한다.
// onPointerDown/Move/Up은 이벤트를 소비했으면 true를 반환하고, BoardCanvas는 그 경우에만
// 자기 핸들러에서 바로 return한다 — false면 카메라/스티커 쪽으로 계속 진행해야 한다.
export function useDrawingSelection({
  isEditMode,
  cameraRef,
  pointersRef,
  drawingsRef,
  trashButtonRef,
  hitTestSticker,
  combinedZIndexPool,
  setSelectedStickerId,
  resetTextSelection,
  applyDrawingChange,
  markDrawingDeleted,
  moveDrawing,
  deleteDrawing,
  onDrawingDeleteArmedChange,
  onDrawingDragOverTrashChange,
}: UseDrawingSelectionParams) {
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  // 선택된 그림을 꾹 눌러 삭제 가능 상태로 승격했는지
  const [isDrawingDeleteArmed, setIsDrawingDeleteArmed] = useState(false);
  // 선택된 그림을 드래그하는 동안, 현재 휴지통 버튼 위에 있는지 — 놓기 전 시각 피드백(확대)에 사용
  const [isDrawingOverTrash, setIsDrawingOverTrash] = useState(false);
  // 선택 박스의 원래 크기(선택 시점 기준, 회전과 무관하게 고정) — 선택 해제 후 다시 선택하면 새로 계산
  const [selectedDrawingBaseSize, setSelectedDrawingBaseSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // 선택 박스의 현재 중심/회전/배율(직전 제스처까지 반영된, 확정된 값)
  const [selectedDrawingBoxTransform, setSelectedDrawingBoxTransform] =
    useState<DrawingBoxTransform | null>(null);
  // 선택된 그림의 드래그/핀치 모드와 그 시작 기준값 — drawingSelectionGestureReducer가 전이를 담당
  const drawingSelectionGestureRef = useRef<DrawingSelectionGesture | null>(null);
  // 휴지통 호버 진입 순간에만 햅틱을 울리기 위해 직전 프레임의 호버 여부를 들고 있는다
  const wasOverTrashRef = useRef(false);
  const selectedDrawingBoxTransformRef = useRef<DrawingBoxTransform | null>(null);
  const drawingPreviewElementRef = useRef<SVGSVGElement | null>(null);
  const drawingBoxPreviewElementRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<DrawingBoxTransform | null>(null);
  const gestureBaseRef = useRef<DrawingBoxTransform>({ x: 0, y: 0, rotation: 0, scale: 1 });
  const frameRef = useRef<number | null>(null);
  const pinchPointerIdsRef = useRef<number[]>([]);

  const paintPreview = () => {
    const preview = previewRef.current;
    const transform = preview
      ? `translate(${preview.x}px, ${preview.y}px) rotate(${preview.rotation}deg) scale(${preview.scale})`
      : '';
    if (drawingPreviewElementRef.current) {
      drawingPreviewElementRef.current.style.transform = transform;
      drawingPreviewElementRef.current.style.willChange = preview ? 'transform' : '';
    }
    if (drawingBoxPreviewElementRef.current) {
      drawingBoxPreviewElementRef.current.style.transform = transform;
      // 선택 테두리와 모서리 손잡이는 확대 중에도 화면상의 두께를 유지한다.
      drawingBoxPreviewElementRef.current.style.setProperty(
        '--inv-camera-scale',
        String(1 / (cameraRef.current.scale * (preview?.scale ?? 1))),
      );
    }
  };

  const schedulePreview = (next: DrawingBoxTransform) => {
    previewRef.current = next;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      paintPreview();
    });
  };

  const cancelPreviewFrame = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };

  useLayoutEffect(() => {
    const element = drawingPreviewElementRef.current;
    return () => {
      cancelPreviewFrame();
      if (selectedDrawingId) {
        previewRef.current = null;
        drawingSelectionGestureRef.current = null;
      }
      // 선택 해제 시 ref가 분리되어도 이전 SVG에 변환이 남지 않는다.
      if (element) {
        element.style.transform = '';
        element.style.willChange = '';
      }
    };
  }, [selectedDrawingId, isEditMode]);

  // 최종 경로를 React가 반영한 commit에서 임시 transform도 제거한다.
  useLayoutEffect(() => {
    paintPreview();
  });

  useEffect(() => {
    selectedDrawingBoxTransformRef.current = selectedDrawingBoxTransform;
  });

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
    selectedDrawingBoxTransformRef.current = null;
  }, [isEditMode]);

  // 렌더 중 isEditMode 전환을 감지한 BoardCanvas가 호출한다 — 편집 모드를 벗어났다가 다시
  // 들어와도 이전 선택이 되살아나지 않도록 상태 자체를 지운다
  const resetSelection = () => {
    setSelectedDrawingId(null);
    setIsDrawingOverTrash(false);
    setIsDrawingDeleteArmed(false);
    setSelectedDrawingBaseSize(null);
    setSelectedDrawingBoxTransform(null);
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

  // 그림은 pointerdown 즉시 선택(selectDrawing)되고, 계속 누른 채 유지하면 이 롱프레스가
  // 발동해 삭제 가능 상태로 승격한다(휴지통 바 노출) — 손을 떼지 않고 그대로 끌면 드래그가 이어져
  // 휴지통 위에서 놓으면 삭제된다
  const drawingLongPress = useLongPress({
    onLongPress: (drawingId) => {
      bridge.send('HAPTIC', { type: 'heavy' });
      if (!isEditMode) {
        selectDrawing(drawingId);
      }
      setIsDrawingDeleteArmed(true);
    },
  });

  // 그림을 선택하면(탭 또는 롱프레스 시작) 스티커 선택은 해제하고, 스티커+그림 통틀어
  // 맨 위로 보이도록 zIndex를 올린다. 삭제 가능 상태로의 승격은 별도(drawingLongPress)로 처리한다.
  // 이동 모드는 세션 로컬 변경분에 반영하고, 기본 모드는(세션 개념이 없으므로) 바로 저장한다
  const selectDrawing = (drawingId: string) => {
    setSelectedStickerId(null);
    resetTextSelection();
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
        if (isEditMode) {
          applyDrawingChange(drawingId, { zIndex: newZIndex });
        } else {
          moveDrawing(
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

  const onPointerDown = (e: PointerEvent, point: Point): boolean => {
    if (pointersRef.current.size === 1) {
      const worldPoint = toWorldPoint(cameraRef.current, point);

      if (isEditMode && selectedDrawingId) {
        const selected = drawingsRef.current.find((d) => d.id === selectedDrawingId);
        const bounds = selected && getDrawingBounds(selected.points, selected.strokeWidth);

        if (bounds && isPointInDrawingBounds(worldPoint, bounds)) {
          drawingSelectionGestureRef.current = drawingSelectionGestureReducer(
            drawingSelectionGestureRef.current,
            { type: 'POINTER_DOWN', pointerId: e.pointerId, worldPoint },
          );
          gestureBaseRef.current = { x: 0, y: 0, rotation: 0, scale: 1 };
          wasOverTrashRef.current = false;
          // 이미 선택된 그림을 다시 눌러도, 계속 누르고 있으면 삭제 가능 상태로 승격될 수 있다
          drawingLongPress.start(point, selectedDrawingId);
        } else {
          setSelectedDrawingId(null);
          setSelectedDrawingBaseSize(null);
          setSelectedDrawingBoxTransform(null);
        }
        return true;
      }

      if (!hitTestSticker(e.target)) {
        const hitDrawingId = hitTestDrawingId(worldPoint, drawingsRef.current);
        if (hitDrawingId) {
          // 이동 모드는 탭하면 바로 선택(이동 가능 상태)되고, 기본 모드는 롱프레스가
          // 발동하는 순간에만 선택된다(delete-armed와 동시에) — 기존 그림을 선택하는
          // 중엔 스티커 팬/선택을 시작하지 않는다
          if (isEditMode) {
            selectDrawing(hitDrawingId);
          }
          drawingSelectionGestureRef.current = drawingSelectionGestureReducer(
            drawingSelectionGestureRef.current,
            { type: 'POINTER_DOWN', pointerId: e.pointerId, worldPoint },
          );
          gestureBaseRef.current = { x: 0, y: 0, rotation: 0, scale: 1 };
          wasOverTrashRef.current = false;
          drawingLongPress.start(point, hitDrawingId);
          return true;
        }
      }
      return false;
    }

    if (pointersRef.current.size === 2 && selectedDrawingId) {
      drawingLongPress.cancel();
      const points = [...pointersRef.current.values()];
      pinchPointerIdsRef.current = [...pointersRef.current.keys()];
      gestureBaseRef.current = previewRef.current ?? { x: 0, y: 0, rotation: 0, scale: 1 };
      setIsDrawingOverTrash(false);
      wasOverTrashRef.current = false;

      const selected = drawingsRef.current.find((d) => d.id === selectedDrawingId);
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
      return true;
    }

    return drawingSelectionGestureRef.current?.kind === 'pinching';
  };

  const updatePinchPreview = (points: [Point, Point]) => {
    const gesture = drawingSelectionGestureRef.current;
    if (gesture?.kind !== 'pinching') return;
    const current: PinchSample = {
      centroid: toWorldPoint(cameraRef.current, centroid(points)),
      distance: distance(points[0], points[1]),
      angle: angleBetween(points[0], points[1]),
    };
    const delta = computeDrawingBoxPinchTransform(
      { x: 0, y: 0, rotation: 0, scale: 1 },
      gesture.startSample,
      current,
    );
    schedulePreview(composeDrawingTransform(gestureBaseRef.current, delta));
  };

  const onPointerMove = (e: PointerEvent, point: Point): boolean => {
    if (pointersRef.current.size >= 2) {
      drawingLongPress.cancel();
      const selectionGesture = drawingSelectionGestureRef.current;

      if (selectionGesture?.kind === 'dragging') {
        // 드래그 중 두 번째 손가락이 닿으면 드래그를 취소한다(선택은 유지) — 기존 스티커/카메라 핀치로 계속 진행
        drawingSelectionGestureRef.current = null;
        cancelPreviewFrame();
        previewRef.current = null;
        paintPreview();
        setIsDrawingOverTrash(false);
        wasOverTrashRef.current = false;
        return false;
      }

      if (selectionGesture?.kind === 'pinching') {
        const points = pinchPointerIdsRef.current.map((id) => pointersRef.current.get(id));
        if (points[0] && points[1]) updatePinchPreview([points[0], points[1]]);
        return true;
      }
      // 선택된 그림이 없으면(핀치 시작 안 됐으면) 기존 스티커/카메라 핀치 로직으로 계속 진행
      return false;
    }

    if (selectedDrawingId) {
      const gesture = drawingSelectionGestureRef.current;
      if (gesture?.kind !== 'dragging' || gesture.pointerId !== e.pointerId) return true;
      // 너무 많이 움직이면 삭제 가능 상태로의 승격이 취소되고(제자리에서 계속 누르고 있어야
      // 승격됨), 이미 승격된 뒤라면 이 호출은 아무 효과가 없다
      drawingLongPress.move(point);
      const worldPoint = toWorldPoint(cameraRef.current, point);
      schedulePreview({
        ...gestureBaseRef.current,
        x: gestureBaseRef.current.x + worldPoint.x - gesture.startWorldPoint.x,
        y: gestureBaseRef.current.y + worldPoint.y - gesture.startWorldPoint.y,
      });
      const overTrash = isOverTrash(e);
      // 휴지통 위로 막 넘어온 순간(rising edge)에만 햅틱 — 계속 위에 머물러도 반복 발동하지 않는다
      if (overTrash && !wasOverTrashRef.current) {
        bridge.send('HAPTIC', { type: 'medium' });
      }
      wasOverTrashRef.current = overTrash;
      setIsDrawingOverTrash(overTrash);
      return true;
    }

    // 롱프레스로 그림을 고르는 중이면(아직 선택 확정 전), 너무 많이 움직이면 취소되게 계속 알려준다
    drawingLongPress.move(point);
    return false;
  };

  const onPointerUp = (e: PointerEvent, point: Point): boolean => {
    // 손을 뗐는데 롱프레스 타이머가 아직 안 끝났으면(=탭이었으면) 취소 —
    // 안 그러면 손을 뗀 뒤에도 타이머가 계속 돌다가 뒤늦게 선택돼버린다
    drawingLongPress.cancel();

    if (!selectedDrawingId) return false;

    const selectionGesture = drawingSelectionGestureRef.current;
    // pointerup 자체의 마지막 좌표도 반영한다. BoardCanvas는 이미 이 포인터를 Map에서 지웠다.
    if (selectionGesture?.kind === 'pinching' && e.type !== 'pointercancel') {
      const points = pinchPointerIdsRef.current.map((id) =>
        id === e.pointerId ? point : pointersRef.current.get(id),
      );
      if (points[0] && points[1]) updatePinchPreview([points[0], points[1]]);
    } else if (
      selectionGesture?.kind === 'dragging' &&
      selectionGesture.pointerId === e.pointerId &&
      e.type !== 'pointercancel'
    ) {
      const worldPoint = toWorldPoint(cameraRef.current, point);
      if (
        previewRef.current ||
        worldPoint.x !== selectionGesture.startWorldPoint.x ||
        worldPoint.y !== selectionGesture.startWorldPoint.y
      ) {
        schedulePreview({
          ...gestureBaseRef.current,
          x: gestureBaseRef.current.x + worldPoint.x - selectionGesture.startWorldPoint.x,
          y: gestureBaseRef.current.y + worldPoint.y - selectionGesture.startWorldPoint.y,
        });
      }
    }
    if (selectionGesture?.kind === 'pinching' && pointersRef.current.size === 2) {
      onPointerDown(e, point); // 세 손가락 중 하나를 뗐다면 남은 두 손가락으로 기준을 갱신한다.
      return true;
    }
    if (pointersRef.current.size >= 2) return true;

    if (selectionGesture?.kind === 'pinching' && pointersRef.current.size === 1) {
      const [remainingPointerId, remainingPoint] = [...pointersRef.current][0]!;
      drawingSelectionGestureRef.current = drawingSelectionGestureReducer(selectionGesture, {
        type: 'POINTER_UP_TO_ONE',
        remainingPointerId,
        remainingWorldPoint: toWorldPoint(cameraRef.current, remainingPoint),
      });
      gestureBaseRef.current = previewRef.current ?? { x: 0, y: 0, rotation: 0, scale: 1 };
      return true;
    }

    const dragStart = selectionGesture?.kind === 'dragging' ? selectionGesture : null;
    const preview = previewRef.current;
    drawingSelectionGestureRef.current = drawingSelectionGestureReducer(selectionGesture, {
      type: 'POINTER_UP_TO_ZERO',
    });
    cancelPreviewFrame();
    previewRef.current = null;
    setIsDrawingOverTrash(false);
    wasOverTrashRef.current = false;
    setIsDrawingDeleteArmed(false);

    if (dragStart && dragStart.pointerId === e.pointerId && isOverTrash(e)) {
      if (isEditMode) {
        markDrawingDeleted(selectedDrawingId);
      } else {
        deleteDrawing(selectedDrawingId);
      }
      setSelectedDrawingId(null);
      setSelectedDrawingBaseSize(null);
      setSelectedDrawingBoxTransform(null);
      return true;
    }

    const drawing = drawingsRef.current.find((d) => d.id === selectedDrawingId);
    if (drawing && preview) {
      const points = drawing.points.map((point) => transformDrawingPoint(point, preview));
      const strokeWidth = drawing.strokeWidth * preview.scale;
      if (isEditMode) {
        applyDrawingChange(drawing.id, { points, strokeWidth });
      } else {
        moveDrawing(
          toDrawingMoveInput(drawing.id, points, {
            color: drawing.color,
            strokeWidth,
            zIndex: drawing.zIndex,
          }),
        );
      }
      const baseBox = selectedDrawingBoxTransformRef.current;
      if (baseBox) {
        const finalBox = composeDrawingTransform(baseBox, preview);
        selectedDrawingBoxTransformRef.current = finalBox;
        setSelectedDrawingBoxTransform(finalBox);
      }
    }

    // 기본 모드는 이동 가능 상태 없이 롱프레스로만 들어오므로, 제스처가 끝나면
    // (휴지통에 놓지 않았어도) 선택을 유지하지 않고 매번 새로 롱프레스해야 한다
    if (!isEditMode) {
      setSelectedDrawingId(null);
      setSelectedDrawingBaseSize(null);
      setSelectedDrawingBoxTransform(null);
    }
    return true;
  };

  return {
    selectedDrawingId,
    drawingPreviewElementRef,
    drawingBoxPreviewElementRef,
    selectedDrawingBaseSize,
    selectedDrawingBoxTransform,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetSelection,
    // 손가락 개수가 애매해서(예: 3개 이상) 이 훅의 소관이 아닐 때 BoardCanvas가 방어적으로 부른다
    cancelLongPress: drawingLongPress.cancel,
  };
}
