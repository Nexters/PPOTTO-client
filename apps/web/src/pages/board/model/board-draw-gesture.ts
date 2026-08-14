import type { CameraState } from './board-camera';
import { shouldSampleStrokePoint } from './board-drawing';
import { centroid, distance, type Point } from './geometry';

export type DrawGesture =
  | { kind: 'drawing'; pointerId: number; points: Point[] }
  | { kind: 'pinching'; startCamera: CameraState; startCentroid: Point; startDistance: number };

export type DrawGestureEvent =
  | { type: 'POINTER_DOWN'; pointerId: number; point: Point } // 1번째 손가락
  | { type: 'POINTER_MOVE'; pointerId: number; point: Point }
  | { type: 'MULTI_TOUCH'; points: [Point, Point]; camera: CameraState } // 2번째 손가락
  | { type: 'POINTER_UP_TO_ONE' } // 손가락 하나 남음(핀치 종료, 이어서 그리진 않음)
  | { type: 'POINTER_UP_TO_ZERO' }; // 마지막 손가락 뗌

// 두 번째 손가락이 닿았을 때(핀치줌 전환), 그리던 선의 시작점~마지막점 거리(보드 좌표 단위)가
// 이 값 이상이면 핀치줌 시작 의도가 아니라 실제로 그리던 중이었다고 보고 저장한다
const PINCH_INTERRUPT_KEEP_DISTANCE = 2;

export type DrawGestureResult = {
  state: DrawGesture | null;
  // 이번 전이로 완성돼 저장해야 할 선. 없으면 null (호출자가 실제 저장 요청을 보낸다)
  finalizedStroke: Point[] | null;
};

// 손가락 개수 변화와 이동에 따른 그리기/핀치줌 상태 전이만 계산하는 순수 함수.
// 실제 카메라 이동이나 그림 저장(API 호출)은 이 함수의 책임이 아니라 호출자가 처리한다.
export function drawGestureReducer(
  state: DrawGesture | null,
  event: DrawGestureEvent,
): DrawGestureResult {
  switch (event.type) {
    case 'POINTER_DOWN':
      return {
        state: { kind: 'drawing', pointerId: event.pointerId, points: [event.point] },
        finalizedStroke: null,
      };

    case 'POINTER_MOVE': {
      if (state?.kind !== 'drawing' || state.pointerId !== event.pointerId) {
        return { state, finalizedStroke: null };
      }
      if (!shouldSampleStrokePoint(state.points, event.point)) {
        return { state, finalizedStroke: null };
      }
      return {
        state: { ...state, points: [...state.points, event.point] },
        finalizedStroke: null,
      };
    }

    case 'MULTI_TOUCH': {
      const nextState: DrawGesture = {
        kind: 'pinching',
        startCamera: event.camera,
        startCentroid: centroid(event.points),
        startDistance: distance(event.points[0], event.points[1]),
      };
      if (state?.kind !== 'drawing') return { state: nextState, finalizedStroke: null };

      const drewBeyondPoint =
        distance(state.points[0]!, state.points[state.points.length - 1]!) >=
        PINCH_INTERRUPT_KEEP_DISTANCE;
      return { state: nextState, finalizedStroke: drewBeyondPoint ? state.points : null };
    }

    case 'POINTER_UP_TO_ONE':
      return { state: null, finalizedStroke: null };

    case 'POINTER_UP_TO_ZERO':
      return {
        state: null,
        finalizedStroke: state?.kind === 'drawing' ? state.points : null,
      };
  }
}
