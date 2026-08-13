/**
 * 동작 범위 (2026-08-11 — BoardCanvas.tsx에서 전이 로직만 순수 reducer로 분리)
 *
 * gestureReducer는 손가락 개수 변화에 따른 제스처 상태 전이만 계산한다. 카메라를 얼마나
 * 움직이거나 스티커를 얼마나 변형할지는 이 함수의 책임이 아니다(board-camera.ts/board-transform.ts).
 *
 * 제스처가 업그레이드/다운그레이드될 때 기준값을 다시 잡을 때(rebase), 화면에 실시간으로 보이는
 * 값(liveTransform)이 있으면 그걸, 없으면 제스처 시작 시점 값을 기준으로 삼는다.
 */
import { describe, expect, it } from 'vitest';

import type { StickerData } from '../ui/Sticker';

import { type DragTransform, type Gesture, gestureReducer } from './board-gesture';

function fakeSticker(overrides: Partial<StickerData> = {}): StickerData {
  return {
    id: 'sticker-1',
    type: 'IMAGE',
    title: '제목',
    isNew: false,
    imageUrl: null,
    textContent: null,
    posX: 100,
    posY: 100,
    rotation: 0,
    scale: 1,
    zIndex: 1,
    badgeOffsetX: 0,
    badgeOffsetY: 0,
    ...overrides,
  };
}

describe('gestureReducer', () => {
  describe('POINTER_DOWN', () => {
    it('편집모드에서 스티커를 누르면 그 스티커의 현재 위치/회전/크기를 기준으로 move 상태가 된다', () => {
      const sticker = fakeSticker({ posX: 10, posY: 20, rotation: 30, scale: 2 });

      const result = gestureReducer(null, {
        type: 'POINTER_DOWN',
        pointerId: 1,
        point: { x: 5, y: 5 },
        camera: { x: 0, y: 0, scale: 1 },
        stickerHit: sticker,
        isEditMode: true,
      });

      expect(result).toEqual({
        kind: 'move',
        pointerId: 1,
        sticker,
        startClient: { x: 5, y: 5 },
        startTransform: { x: 10, y: 20, rotation: 30, scale: 2 },
      });
    });

    it('스티커가 없는 배경을 누르면 그 시점 카메라를 기준으로 pan 상태가 된다', () => {
      const camera = { x: 1, y: 2, scale: 1.5 };

      const result = gestureReducer(null, {
        type: 'POINTER_DOWN',
        pointerId: 1,
        point: { x: 5, y: 5 },
        camera,
        stickerHit: null,
        isEditMode: true,
      });

      expect(result).toEqual({
        kind: 'pan',
        pointerId: 1,
        startClient: { x: 5, y: 5 },
        startCamera: camera,
      });
    });

    it('스티커를 눌러도 편집모드가 아니면 pan 상태가 된다', () => {
      const result = gestureReducer(null, {
        type: 'POINTER_DOWN',
        pointerId: 1,
        point: { x: 5, y: 5 },
        camera: { x: 0, y: 0, scale: 1 },
        stickerHit: fakeSticker(),
        isEditMode: false,
      });

      expect(result?.kind).toBe('pan');
    });
  });

  describe('MULTI_TOUCH', () => {
    it('배경을 팬하던 중 두 번째 손가락이 닿으면, 그 시점 두 손가락 중점·거리·카메라를 기준으로 pinch로 전환된다', () => {
      const state: Gesture = {
        kind: 'pan',
        pointerId: 1,
        startClient: { x: 0, y: 0 },
        startCamera: { x: 0, y: 0, scale: 1 },
      };
      const camera = { x: 10, y: 20, scale: 1 };

      const result = gestureReducer(state, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        camera,
        liveTransform: null,
      });

      expect(result).toEqual({
        kind: 'pinch',
        startCentroid: { x: 5, y: 0 },
        startDistance: 10,
        startCamera: camera,
      });
    });

    it('스티커를 이동하던 중 두 번째 손가락이 닿으면, 두 손가락 중점을 보드 좌표로 변환해 stickerPinch로 전환된다', () => {
      const sticker = fakeSticker();
      const state: Gesture = {
        kind: 'move',
        pointerId: 1,
        sticker,
        startClient: { x: 0, y: 0 },
        startTransform: { x: 100, y: 100, rotation: 0, scale: 1 },
      };
      const camera = { x: 20, y: 10, scale: 2 };

      const result = gestureReducer(state, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 20, y: 10 },
          { x: 40, y: 10 },
        ],
        camera,
        liveTransform: null,
      });

      expect(result).toEqual({
        kind: 'stickerPinch',
        sticker,
        startCentroid: { x: 5, y: 0 }, // 화면 중점(30,10)을 카메라(x:20,y:10,scale:2) 기준 보드 좌표로 변환
        startDistance: 20,
        startAngle: 0,
        startTransform: { x: 100, y: 100, rotation: 0, scale: 1 },
      });
    });

    it('스티커를 이동하던 중 이미 실시간으로 움직인 값이 있으면, 제스처 시작값이 아니라 그 실시간 값을 stickerPinch 기준으로 삼는다', () => {
      const sticker = fakeSticker();
      const state: Gesture = {
        kind: 'move',
        pointerId: 1,
        sticker,
        startClient: { x: 0, y: 0 },
        startTransform: { x: 100, y: 100, rotation: 0, scale: 1 },
      };
      const liveTransform: DragTransform = {
        id: sticker.id,
        x: 150,
        y: 120,
        rotation: 10,
        scale: 1.2,
      };

      const result = gestureReducer(state, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        camera: { x: 0, y: 0, scale: 1 },
        liveTransform,
      });

      expect(result?.kind === 'stickerPinch' && result.startTransform).toEqual({
        x: 150,
        y: 120,
        rotation: 10,
        scale: 1.2,
      });
    });

    it('실시간 값이 다른 스티커 것이면 무시하고 제스처 시작값을 기준으로 삼는다', () => {
      const sticker = fakeSticker({ id: 'sticker-1' });
      const state: Gesture = {
        kind: 'move',
        pointerId: 1,
        sticker,
        startClient: { x: 0, y: 0 },
        startTransform: { x: 100, y: 100, rotation: 0, scale: 1 },
      };
      const liveTransform: DragTransform = {
        id: 'other-sticker',
        x: 999,
        y: 999,
        rotation: 999,
        scale: 9,
      };

      const result = gestureReducer(state, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        camera: { x: 0, y: 0, scale: 1 },
        liveTransform,
      });

      expect(result?.kind === 'stickerPinch' && result.startTransform).toEqual({
        x: 100,
        y: 100,
        rotation: 0,
        scale: 1,
      });
    });

    it('이미 pinch나 stickerPinch 상태에서 손가락이 계속 2개 이상이면 기준을 다시 잡지 않고 그대로 유지한다', () => {
      const state: Gesture = {
        kind: 'pinch',
        startCentroid: { x: 1, y: 1 },
        startDistance: 5,
        startCamera: { x: 0, y: 0, scale: 1 },
      };

      const result = gestureReducer(state, {
        type: 'MULTI_TOUCH',
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        camera: { x: 0, y: 0, scale: 1 },
        liveTransform: null,
      });

      expect(result).toBe(state);
    });
  });

  describe('POINTER_UP_TO_ONE', () => {
    it('보드를 핀치줌하던 중 손가락 하나가 떨어지면, 남은 손가락과 그 시점 카메라를 기준으로 pan을 이어간다', () => {
      const state: Gesture = {
        kind: 'pinch',
        startCentroid: { x: 0, y: 0 },
        startDistance: 10,
        startCamera: { x: 0, y: 0, scale: 1 },
      };
      const camera = { x: 5, y: 5, scale: 1.2 };

      const result = gestureReducer(state, {
        type: 'POINTER_UP_TO_ONE',
        remainingPointerId: 2,
        remainingPoint: { x: 30, y: 40 },
        camera,
        liveTransform: null,
      });

      expect(result).toEqual({
        kind: 'pan',
        pointerId: 2,
        startClient: { x: 30, y: 40 },
        startCamera: camera,
      });
    });

    it('스티커를 회전·확대하던 중 손가락 하나가 떨어지면, 그 시점 실시간 값을 기준으로 이동을 이어간다', () => {
      const sticker = fakeSticker();
      const state: Gesture = {
        kind: 'stickerPinch',
        sticker,
        startCentroid: { x: 0, y: 0 },
        startDistance: 10,
        startAngle: 0,
        startTransform: { x: 100, y: 100, rotation: 0, scale: 1 },
      };
      const liveTransform: DragTransform = {
        id: sticker.id,
        x: 150,
        y: 160,
        rotation: 20,
        scale: 1.5,
      };

      const result = gestureReducer(state, {
        type: 'POINTER_UP_TO_ONE',
        remainingPointerId: 2,
        remainingPoint: { x: 30, y: 40 },
        camera: { x: 0, y: 0, scale: 1 },
        liveTransform,
      });

      expect(result).toEqual({
        kind: 'move',
        pointerId: 2,
        sticker,
        startClient: { x: 30, y: 40 },
        startTransform: { x: 150, y: 160, rotation: 20, scale: 1.5 },
      });
    });
  });

  describe('POINTER_UP_TO_ZERO', () => {
    it('마지막 손가락이 떨어지면 어떤 상태에서든 제스처가 사라진다', () => {
      const state: Gesture = {
        kind: 'pan',
        pointerId: 1,
        startClient: { x: 0, y: 0 },
        startCamera: { x: 0, y: 0, scale: 1 },
      };

      const result = gestureReducer(state, { type: 'POINTER_UP_TO_ZERO' });

      expect(result).toBeNull();
    });
  });
});
