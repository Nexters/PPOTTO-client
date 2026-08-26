/**
 * 동작 범위 (2026-08-25)
 *
 * drawingSelectionGestureReducer는 선택된 그림을 드래그하는 중인지 두 손가락으로
 * 회전+확대(pinch)하는 중인지, 그 전이만 계산한다. 실제 좌표 변형(computeDrawingPinchTransform 등)이나
 * 저장은 이 함수의 책임이 아니라 호출자가 처리한다. basePoints/baseStrokeWidth/baseBoxTransform은
 * 호출자가 "핀치 시작 시점 기준값으로 뭘 쓸지"를 이미 정해서 이벤트에 실어 보낸다 — 리듀서는 그걸
 * 그대로 담을 뿐 스스로 결정하지 않는다.
 */
import { describe, expect, it } from 'vitest';

import {
  drawingSelectionGestureReducer,
  type DrawingSelectionGesture,
} from './board-drawing-selection';

describe('drawingSelectionGestureReducer', () => {
  describe('POINTER_DOWN', () => {
    it('그림을 누르면 그 시점 포인터/보드 좌표를 기준으로 dragging 상태가 된다', () => {
      const result = drawingSelectionGestureReducer(null, {
        type: 'POINTER_DOWN',
        pointerId: 1,
        worldPoint: { x: 10, y: 20 },
      });

      expect(result).toEqual({ kind: 'dragging', pointerId: 1, startWorldPoint: { x: 10, y: 20 } });
    });
  });

  describe('MULTI_TOUCH', () => {
    it('두 번째 손가락이 닿으면, 두 손가락 중점을 보드 좌표로 변환하고 호출자가 넘긴 기준값으로 pinching 상태가 된다', () => {
      const state: DrawingSelectionGesture = {
        kind: 'dragging',
        pointerId: 1,
        startWorldPoint: { x: 0, y: 0 },
      };
      const camera = { x: 20, y: 10, scale: 2 };
      const baseBoxTransform = { x: 5, y: 5, rotation: 0, scale: 1 };

      const result = drawingSelectionGestureReducer(state, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 20, y: 10 },
          { x: 40, y: 10 },
        ],
        camera,
        basePoints: [{ x: 0, y: 0 }],
        baseStrokeWidth: 8,
        baseBoxTransform,
      });

      expect(result).toEqual({
        kind: 'pinching',
        startSample: {
          centroid: { x: 5, y: 0 }, // 화면 중점(30,10)을 카메라(x:20,y:10,scale:2) 기준 보드 좌표로 변환
          distance: 20,
          angle: 0,
        },
        basePoints: [{ x: 0, y: 0 }],
        baseStrokeWidth: 8,
        baseBoxTransform,
      });
    });

    it('아직 선택 박스가 확정되지 않아 기준값이 없으면(null) 그대로 null로 담는다', () => {
      const result = drawingSelectionGestureReducer(null, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        camera: { x: 0, y: 0, scale: 1 },
        basePoints: [{ x: 0, y: 0 }],
        baseStrokeWidth: 4,
        baseBoxTransform: null,
      });

      expect(result?.kind === 'pinching' && result.baseBoxTransform).toBeNull();
    });
  });

  describe('POINTER_UP_TO_ONE', () => {
    it('회전·확대하던 중 손가락 하나가 떨어지면, 남은 손가락 기준으로 dragging을 이어간다', () => {
      const state: DrawingSelectionGesture = {
        kind: 'pinching',
        startSample: { centroid: { x: 0, y: 0 }, distance: 10, angle: 0 },
        basePoints: [{ x: 0, y: 0 }],
        baseStrokeWidth: 4,
        baseBoxTransform: null,
      };

      const result = drawingSelectionGestureReducer(state, {
        type: 'POINTER_UP_TO_ONE',
        remainingPointerId: 2,
        remainingWorldPoint: { x: 30, y: 40 },
      });

      expect(result).toEqual({ kind: 'dragging', pointerId: 2, startWorldPoint: { x: 30, y: 40 } });
    });

    it('pinching 상태가 아니면(드래그 중 등) 아무 전이도 하지 않고 그대로 유지한다', () => {
      const state: DrawingSelectionGesture = {
        kind: 'dragging',
        pointerId: 1,
        startWorldPoint: { x: 0, y: 0 },
      };

      const result = drawingSelectionGestureReducer(state, {
        type: 'POINTER_UP_TO_ONE',
        remainingPointerId: 2,
        remainingWorldPoint: { x: 30, y: 40 },
      });

      expect(result).toBe(state);
    });
  });

  describe('POINTER_UP_TO_ZERO', () => {
    it('마지막 손가락이 떨어지면 어떤 상태에서든 사라진다', () => {
      const state: DrawingSelectionGesture = {
        kind: 'dragging',
        pointerId: 1,
        startWorldPoint: { x: 0, y: 0 },
      };

      const result = drawingSelectionGestureReducer(state, { type: 'POINTER_UP_TO_ZERO' });

      expect(result).toBeNull();
    });
  });
});
