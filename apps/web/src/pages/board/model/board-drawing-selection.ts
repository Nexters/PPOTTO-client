import { type CameraState, toWorldPoint } from './board-camera';
import type { DrawingBoxTransform } from './board-drawing';
import type { PinchSample } from './board-transform';
import { angleBetween, centroid, distance, type Point } from './geometry';

// 선택된 그림을 드래그하거나 두 손가락으로 회전+확대하는 동안, 지금이 드래그/핀치 중 어느
// 쪽인지와 그 시작 기준값의 전이만 담당하는 순수 함수. 실제 좌표 계산(compute*Transform)이나
// 저장은 이 함수의 책임이 아니라 호출자가 처리한다.
export type DrawingSelectionGesture =
  | { kind: 'dragging'; pointerId: number; startWorldPoint: Point }
  | {
      kind: 'pinching';
      startSample: PinchSample;
      basePoints: Point[];
      baseStrokeWidth: number;
      baseBoxTransform: DrawingBoxTransform | null;
    };

export type DrawingSelectionEvent =
  | { type: 'POINTER_DOWN'; pointerId: number; worldPoint: Point } // 1번째 손가락(드래그 시작)
  | {
      type: 'MULTI_TOUCH'; // 2번째 손가락(핀치 시작) — basePoints/baseBoxTransform은 호출자가 선택
      points: [Point, Point];
      camera: CameraState;
      basePoints: Point[];
      baseStrokeWidth: number;
      baseBoxTransform: DrawingBoxTransform | null;
    }
  | { type: 'POINTER_UP_TO_ONE'; remainingPointerId: number; remainingWorldPoint: Point } // 손가락 하나 남음(핀치 종료, 남은 손가락으로 드래그 이어감)
  | { type: 'POINTER_UP_TO_ZERO' }; // 마지막 손가락 뗌

export function drawingSelectionGestureReducer(
  state: DrawingSelectionGesture | null,
  event: DrawingSelectionEvent,
): DrawingSelectionGesture | null {
  switch (event.type) {
    case 'POINTER_DOWN':
      return { kind: 'dragging', pointerId: event.pointerId, startWorldPoint: event.worldPoint };

    case 'MULTI_TOUCH':
      return {
        kind: 'pinching',
        startSample: {
          centroid: toWorldPoint(event.camera, centroid(event.points)),
          distance: distance(event.points[0], event.points[1]),
          angle: angleBetween(event.points[0], event.points[1]),
        },
        basePoints: event.basePoints,
        baseStrokeWidth: event.baseStrokeWidth,
        baseBoxTransform: event.baseBoxTransform,
      };

    case 'POINTER_UP_TO_ONE':
      if (state?.kind !== 'pinching') return state;
      return {
        kind: 'dragging',
        pointerId: event.remainingPointerId,
        startWorldPoint: event.remainingWorldPoint,
      };

    case 'POINTER_UP_TO_ZERO':
      return null;
  }
}
