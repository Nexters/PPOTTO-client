/**
 * 동작 범위 (2026-08-14 — BoardCanvas.tsx에서 그리기/핀치 전이 로직만 순수 reducer로 분리)
 *
 * drawGestureReducer는 draw 모드에서 손가락 개수 변화·이동에 따른 그리기/핀치줌 상태 전이만
 * 계산한다. 카메라를 얼마나 움직일지(computeBoardPinchZoom)나 그림을 실제로 저장하는 것(API
 * 호출)은 이 함수의 책임이 아니다 — finalizedStroke로 "저장해야 할 선"만 알려주고, 저장 여부의
 * 최종 실행은 호출자가 한다.
 */
import { describe, expect, it } from 'vitest';

import { type DrawGesture, drawGestureReducer } from './board-draw-gesture';

describe('drawGestureReducer', () => {
  describe('POINTER_DOWN', () => {
    it('첫 손가락이 닿으면 그 점 하나로 drawing 상태가 된다', () => {
      const result = drawGestureReducer(null, {
        type: 'POINTER_DOWN',
        pointerId: 1,
        point: { x: 5, y: 5 },
      });

      expect(result).toEqual({
        state: { kind: 'drawing', pointerId: 1, points: [{ x: 5, y: 5 }] },
        finalizedStroke: null,
      });
    });
  });

  describe('POINTER_MOVE', () => {
    it('그리는 중인 손가락이 임계 거리 이상 움직이면 점을 추가한다', () => {
      const state: DrawGesture = { kind: 'drawing', pointerId: 1, points: [{ x: 0, y: 0 }] };

      const result = drawGestureReducer(state, {
        type: 'POINTER_MOVE',
        pointerId: 1,
        point: { x: 10, y: 0 },
      });

      expect(result).toEqual({
        state: {
          kind: 'drawing',
          pointerId: 1,
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
        },
        finalizedStroke: null,
      });
    });

    it('임계 거리보다 가까이 움직이면 점을 추가하지 않는다', () => {
      const state: DrawGesture = { kind: 'drawing', pointerId: 1, points: [{ x: 0, y: 0 }] };

      const result = drawGestureReducer(state, {
        type: 'POINTER_MOVE',
        pointerId: 1,
        point: { x: 0.5, y: 0 },
      });

      expect(result).toEqual({ state, finalizedStroke: null });
    });

    it('그리는 중인 손가락이 아닌 다른 손가락이 움직이면 상태를 바꾸지 않는다', () => {
      const state: DrawGesture = { kind: 'drawing', pointerId: 1, points: [{ x: 0, y: 0 }] };

      const result = drawGestureReducer(state, {
        type: 'POINTER_MOVE',
        pointerId: 2,
        point: { x: 100, y: 100 },
      });

      expect(result).toEqual({ state, finalizedStroke: null });
    });

    it('핀치 중에는 이동 이벤트가 와도 상태를 바꾸지 않는다', () => {
      const state: DrawGesture = {
        kind: 'pinching',
        startCamera: { x: 0, y: 0, scale: 1 },
        startCentroid: { x: 0, y: 0 },
        startDistance: 10,
      };

      const result = drawGestureReducer(state, {
        type: 'POINTER_MOVE',
        pointerId: 1,
        point: { x: 100, y: 100 },
      });

      expect(result).toEqual({ state, finalizedStroke: null });
    });
  });

  describe('MULTI_TOUCH', () => {
    it('그리던 중 두 번째 손가락이 닿았는데 시작점에서 거의 움직이지 않았으면(점 하나 수준) 핀치로 전환하고 버린다', () => {
      const state: DrawGesture = { kind: 'drawing', pointerId: 1, points: [{ x: 0, y: 0 }] };
      const camera = { x: 1, y: 2, scale: 1.5 };

      const result = drawGestureReducer(state, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        camera,
      });

      expect(result).toEqual({
        state: {
          kind: 'pinching',
          startCamera: camera,
          startCentroid: { x: 5, y: 0 },
          startDistance: 10,
        },
        finalizedStroke: null,
      });
    });

    it('그리던 중 두 번째 손가락이 닿았는데 어느 정도 그린 상태였으면 핀치로 전환하면서 그린 선을 저장 대상으로 넘긴다', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];
      const state: DrawGesture = { kind: 'drawing', pointerId: 1, points };

      const result = drawGestureReducer(state, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
        ],
        camera: { x: 0, y: 0, scale: 1 },
      });

      expect(result.finalizedStroke).toBe(points);
      expect(result.state?.kind).toBe('pinching');
    });

    it('그리는 중이 아니었으면(빈 배경에서 바로 두 손가락) 저장할 것 없이 핀치로 전환한다', () => {
      const camera = { x: 0, y: 0, scale: 1 };

      const result = drawGestureReducer(null, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        camera,
      });

      expect(result).toEqual({
        state: {
          kind: 'pinching',
          startCamera: camera,
          startCentroid: { x: 5, y: 0 },
          startDistance: 10,
        },
        finalizedStroke: null,
      });
    });
  });

  describe('POINTER_UP_TO_ONE', () => {
    it('핀치 중 손가락 하나가 떨어지면 상태가 사라진다(남은 손가락으로 이어 그리지 않음)', () => {
      const state: DrawGesture = {
        kind: 'pinching',
        startCamera: { x: 0, y: 0, scale: 1 },
        startCentroid: { x: 0, y: 0 },
        startDistance: 10,
      };

      const result = drawGestureReducer(state, { type: 'POINTER_UP_TO_ONE' });

      expect(result).toEqual({ state: null, finalizedStroke: null });
    });
  });

  describe('POINTER_UP_TO_ZERO', () => {
    it('그리는 중 마지막 손가락이 떨어지면 그린 선을 저장 대상으로 넘긴다', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];
      const state: DrawGesture = { kind: 'drawing', pointerId: 1, points };

      const result = drawGestureReducer(state, { type: 'POINTER_UP_TO_ZERO' });

      expect(result).toEqual({ state: null, finalizedStroke: points });
    });

    it('점 하나만 찍고(드래그 없이) 손가락이 떨어져도 그 점을 저장 대상으로 넘긴다', () => {
      const points = [{ x: 5, y: 5 }];
      const state: DrawGesture = { kind: 'drawing', pointerId: 1, points };

      const result = drawGestureReducer(state, { type: 'POINTER_UP_TO_ZERO' });

      expect(result).toEqual({ state: null, finalizedStroke: points });
    });

    it('핀치 중 마지막 손가락이 떨어지면 저장할 것 없이 상태만 사라진다', () => {
      const state: DrawGesture = {
        kind: 'pinching',
        startCamera: { x: 0, y: 0, scale: 1 },
        startCentroid: { x: 0, y: 0 },
        startDistance: 10,
      };

      const result = drawGestureReducer(state, { type: 'POINTER_UP_TO_ZERO' });

      expect(result).toEqual({ state: null, finalizedStroke: null });
    });
  });
});
