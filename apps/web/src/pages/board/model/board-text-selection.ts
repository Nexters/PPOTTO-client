import { type CameraState, toWorldPoint } from './board-camera';
import type { DrawingBoxTransform } from './board-drawing';
import type { PinchSample } from './board-transform';
import { angleBetween, centroid, distance, type Point } from './geometry';

// 텍스트 선택 박스 변환 제스처
export type TextSelectionGesture =
  | { kind: 'dragging'; pointerId: number; startWorldPoint: Point }
  | { kind: 'pinching'; startSample: PinchSample; baseBoxTransform: DrawingBoxTransform };

export type TextSelectionEvent =
  | { type: 'POINTER_DOWN'; pointerId: number; worldPoint: Point }
  | {
      type: 'MULTI_TOUCH';
      points: [Point, Point];
      camera: CameraState;
      baseBoxTransform: DrawingBoxTransform;
    }
  | { type: 'POINTER_UP_TO_ONE'; remainingPointerId: number; remainingWorldPoint: Point }
  | { type: 'POINTER_UP_TO_ZERO' };

export function textSelectionGestureReducer(
  state: TextSelectionGesture | null,
  event: TextSelectionEvent,
): TextSelectionGesture | null {
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
