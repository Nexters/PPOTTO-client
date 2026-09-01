import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

import { uuidv7 } from '@/shared/lib/uuidv7';

import { type CameraState, computeBoardPinchZoom, toWorldPoint } from './board-camera';
import { type DrawGesture, type DrawGestureResult, drawGestureReducer } from './board-draw-gesture';
import type { ParsedDrawing } from './board-drawing';
import { computeTopZIndex } from './board-layout';
import { centroid, distance, type Point } from './geometry';

type UseDrawModeParams = {
  isDrawMode: boolean;
  cameraRef: RefObject<CameraState>;
  setCamera: Dispatch<SetStateAction<CameraState>>;
  pointersRef: RefObject<Map<number, Point>>;
  drawColor: string;
  drawStrokeWidth: number;
  // 스티커의 zIndex와 그림의 zIndex는 같은 숫자 공간을 공유한다 — 새로 그린 선도 그 풀 기준으로 맨 위에 와야 한다
  combinedZIndexPool: () => { id: string; zIndex: number }[];
  confirmDraftDrawings: (drafts: ParsedDrawing[]) => void;
  onDrawingActiveChange?: (active: boolean) => void;
  onCanUndoChange?: (canUndo: boolean) => void;
  onCanRedoChange?: (canRedo: boolean) => void;
};

// draw 모드의 포인터 처리(그리기/두 손가락 핀치줌)와 draft 상태(undo/redo, 모드 종료 시 일괄 저장)를
// 전부 담당한다. BoardCanvas는 이 훅이 내주는 onPointerDown/Move/Up을 draw 모드일 때만 호출하고,
// drawingPoints/draftDrawings는 그대로 렌더에 쓴다.
export function useDrawMode({
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
}: UseDrawModeParams) {
  const [drawingPoints, setDrawingPoints] = useState<Point[] | null>(null);
  const [draftDrawings, setDraftDrawings] = useState<ParsedDrawing[]>([]);
  const [redoDrawings, setRedoDrawings] = useState<ParsedDrawing[]>([]);

  const drawGestureRef = useRef<DrawGesture | null>(null);
  const draftDrawingsRef = useRef(draftDrawings);
  const redoDrawingsRef = useRef(redoDrawings);
  const isDrawingActiveRef = useRef(false);
  // 모드 종료 이펙트에서 최신 함수를 읽어야 해서 ref로도 들고 있는다(이펙트 deps를 isDrawMode로만 좁게 유지하기 위함)
  const confirmDraftDrawingsRef = useRef(confirmDraftDrawings);

  useEffect(() => {
    draftDrawingsRef.current = draftDrawings;
    redoDrawingsRef.current = redoDrawings;
    confirmDraftDrawingsRef.current = confirmDraftDrawings;
  });

  // 실행취소할 그림이 있는지 여부를 부모에 알림 — 이번 세션에 그린 draft 기준(이미 확정된 그림은 대상 아님)
  useEffect(() => {
    onCanUndoChange?.(draftDrawings.length > 0);
  }, [draftDrawings.length, onCanUndoChange]);

  useEffect(() => {
    onCanRedoChange?.(redoDrawings.length > 0);
  }, [redoDrawings.length, onCanRedoChange]);

  // draw 모드를 나가면(확정 버튼이든 다른 툴바 모드로 전환이든) 이번 세션에 그린 draft를 한 번에
  // 저장하고 비운다. 되돌리기/다시실행 이력도 이번 세션 것이니 같이 비운다
  useEffect(() => {
    if (isDrawMode) return;
    // draw 모드를 나가는 시점의 실제 부수효과(되돌리기 이력 초기화 + 서버 저장)라 렌더 중에는
    // 계산할 수 없다 — derived state가 아니라 "모드 전환"이라는 외부 이벤트에 대한 반응
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRedoDrawings([]);
    const drafts = draftDrawingsRef.current;
    if (drafts.length === 0) return;
    setDraftDrawings([]);
    confirmDraftDrawingsRef.current(drafts);
    // confirmDraftDrawings는 매 렌더 새로 만들어지는 함수라 deps에 넣으면 이 이펙트가 draw 모드와
    // 무관하게 매번 재실행된다 — isDrawMode 전환 시점에만 실행되도록 의도적으로 deps에서 제외
  }, [isDrawMode]);

  // drawGestureReducer 결과를 실제 상태(refs/state)에 반영하고, 완성된 선이 있으면 draft로 담는다
  const applyDrawGestureResult = (result: DrawGestureResult) => {
    drawGestureRef.current = result.state;
    setDrawingPoints(result.state?.kind === 'drawing' ? result.state.points : null);

    // 그리는 중(drawing/pinching) 여부가 실제로 바뀔 때만 부모에 알림
    const isActive = result.state !== null;
    if (isActive !== isDrawingActiveRef.current) {
      isDrawingActiveRef.current = isActive;
      onDrawingActiveChange?.(isActive);
    }

    if (result.finalizedStroke && result.finalizedStroke.length > 0) {
      const finalizedStroke = result.finalizedStroke;
      // 서버에 바로 저장하지 않고 이번 세션의 draft로만 들고 있는다 — draw 모드를 나갈 때 한 번에 저장됨
      setDraftDrawings((prev) => [
        ...prev,
        {
          id: uuidv7(),
          points: finalizedStroke,
          color: drawColor,
          strokeWidth: drawStrokeWidth,
          // 스티커+그림+이번 세션에 이미 그린 draft를 통틀어 맨 위로 — 새로 그리면 항상 맨 위에 온다
          zIndex: computeTopZIndex([...combinedZIndexPool(), ...prev]),
        },
      ]);
      setRedoDrawings([]);
    }
  };

  const onPointerDown = (e: PointerEvent, point: Point) => {
    if (pointersRef.current.size === 1) {
      applyDrawGestureResult(
        drawGestureReducer(drawGestureRef.current, {
          type: 'POINTER_DOWN',
          pointerId: e.pointerId,
          point: toWorldPoint(cameraRef.current, point),
        }),
      );
    } else if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()];
      applyDrawGestureResult(
        drawGestureReducer(drawGestureRef.current, {
          type: 'MULTI_TOUCH',
          points: [points[0]!, points[1]!],
          camera: cameraRef.current,
        }),
      );
    }
  };

  const onPointerMove = (e: PointerEvent, point: Point) => {
    if (pointersRef.current.size >= 2) {
      const points = [...pointersRef.current.values()];
      const gesture = drawGestureRef.current;
      if (gesture?.kind !== 'pinching') return;
      setCamera(
        computeBoardPinchZoom(
          gesture.startCamera,
          { centroid: gesture.startCentroid, distance: gesture.startDistance },
          { centroid: centroid(points), distance: distance(points[0]!, points[1]!) },
        ),
      );
      return;
    }

    applyDrawGestureResult(
      drawGestureReducer(drawGestureRef.current, {
        type: 'POINTER_MOVE',
        pointerId: e.pointerId,
        point: toWorldPoint(cameraRef.current, point),
      }),
    );
  };

  const onPointerUp = () => {
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
  };

  return {
    drawingPoints,
    draftDrawings,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    undoLastStroke: () => {
      const current = draftDrawingsRef.current;
      if (current.length === 0) return;
      const popped = current[current.length - 1]!;
      setDraftDrawings(current.slice(0, -1));
      setRedoDrawings((prev) => [...prev, popped]);
    },
    redoLastStroke: () => {
      const current = redoDrawingsRef.current;
      if (current.length === 0) return;
      const restored = current[current.length - 1]!;
      setRedoDrawings(current.slice(0, -1));
      setDraftDrawings((prev) => [...prev, restored]);
    },
  };
}
