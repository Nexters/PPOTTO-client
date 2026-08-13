import type { StickerData } from '../ui/Sticker';

import { type CameraState, toWorldPoint } from './board-camera';
import type { StickerTransform } from './board-transform';
import { angleBetween, centroid, distance, type Point } from './geometry';

export type DragTransform = { id: string } & StickerTransform;

export type Gesture =
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

export type GestureEvent =
  | {
      type: 'POINTER_DOWN'; // 첫 손가락
      pointerId: number;
      point: Point;
      camera: CameraState;
      stickerHit: StickerData | null;
      isEditMode: boolean;
    }
  | {
      type: 'MULTI_TOUCH'; // 2번째 손가락 이상
      points: [Point, Point];
      camera: CameraState;
      liveTransform: DragTransform | null;
    }
  | {
      type: 'POINTER_UP_TO_ONE'; // 손가락 하나 남음
      remainingPointerId: number;
      remainingPoint: Point;
      camera: CameraState;
      liveTransform: DragTransform | null;
    }
  | { type: 'POINTER_UP_TO_ZERO' }; // 마지막 손가락 뗌

// 진행 중인 제스처의 기준값을 새 손가락 구성 기준으로 다시 잡는다(rebase).
// liveTransform이 그 스티커의 것이면 실시간 값을, 아니면 제스처 시작 시점 값을 기준으로 삼는다.
function rebaseTransform(
  sticker: StickerData,
  startTransform: StickerTransform,
  liveTransform: DragTransform | null,
): StickerTransform {
  if (liveTransform?.id !== sticker.id) return startTransform;
  const { id: _id, ...transform } = liveTransform;
  return transform;
}

// 손가락 개수 변화에 따른 제스처 상태 전이만 담당하는 순수 함수
export function gestureReducer(state: Gesture | null, event: GestureEvent): Gesture | null {
  switch (event.type) {
    case 'POINTER_DOWN': {
      if (event.stickerHit && event.isEditMode) {
        const sticker = event.stickerHit;
        return {
          kind: 'move',
          pointerId: event.pointerId,
          sticker,
          startClient: event.point,
          startTransform: {
            x: sticker.posX ?? 0,
            y: sticker.posY ?? 0,
            rotation: sticker.rotation,
            scale: sticker.scale,
          },
        };
      }
      return {
        kind: 'pan',
        pointerId: event.pointerId,
        startClient: event.point,
        startCamera: event.camera,
      };
    }

    case 'MULTI_TOUCH': {
      if (state?.kind === 'pan') {
        return {
          kind: 'pinch',
          startCentroid: centroid(event.points),
          startDistance: distance(event.points[0], event.points[1]),
          startCamera: event.camera,
        };
      }
      if (state?.kind === 'move') {
        return {
          kind: 'stickerPinch',
          sticker: state.sticker,
          startCentroid: toWorldPoint(event.camera, centroid(event.points)),
          startDistance: distance(event.points[0], event.points[1]),
          startAngle: angleBetween(event.points[0], event.points[1]),
          startTransform: rebaseTransform(state.sticker, state.startTransform, event.liveTransform),
        };
      }
      return state;
    }

    case 'POINTER_UP_TO_ONE': {
      if (state?.kind === 'pinch') {
        return {
          kind: 'pan',
          pointerId: event.remainingPointerId,
          startClient: event.remainingPoint,
          startCamera: event.camera,
        };
      }
      if (state?.kind === 'stickerPinch') {
        return {
          kind: 'move',
          pointerId: event.remainingPointerId,
          sticker: state.sticker,
          startClient: event.remainingPoint,
          startTransform: rebaseTransform(state.sticker, state.startTransform, event.liveTransform),
        };
      }
      return state;
    }

    case 'POINTER_UP_TO_ZERO':
      return null;
  }
}
