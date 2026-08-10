/**
 * 동작 범위 (2026-08-09 재구성 — DOM 전환 + 새 인터랙션 스펙 반영)
 *
 * `computeBoardPinchZoom`는 시작 거리 대비 지금 거리의 '비율'을 배율에 직접 곱해서, 핀치 중
 * pointermove 이벤트 발생 횟수와 무관하게 손가락이 움직인 만큼만 정확히 줌되게 한다. 줌 배율은
 * 0.4~3.0으로 클램프한다(디자인 확정값).
 *
 * 카메라 상태(배율·위치)는 서버에 저장하지 않고 화면을 나갔다 들어오면 초기화되므로 별도 테스트 없음.
 */
import { describe, expect, it } from 'vitest';

import {
  computeBoardPinchZoom,
  computeFocusTarget,
  panCamera,
  zoomCamera,
  zoomCameraTo,
} from './board-camera';

describe('panCamera', () => {
  it('delta만큼 카메라 위치를 이동시킨다', () => {
    const camera = { scale: 1, x: 100, y: 200 };

    const result = panCamera(camera, { x: 20, y: -10 });

    expect(result).toEqual({ scale: 1, x: 120, y: 190 });
  });
});

describe('zoomCamera', () => {
  it('포인터가 가리키는 좌표는 확대·축소 후에도 화면상 같은 위치에 남는다', () => {
    const camera = { scale: 1, x: 50, y: 30 };
    const pointer = { x: 120, y: 80 };

    const worldPoint = {
      x: (pointer.x - camera.x) / camera.scale,
      y: (pointer.y - camera.y) / camera.scale,
    };

    const result = zoomCamera(camera, pointer, -100);

    expect(worldPoint.x * result.scale + result.x).toBeCloseTo(pointer.x);
    expect(worldPoint.y * result.scale + result.y).toBeCloseTo(pointer.y);
  });

  it('휠을 위로 굴리면 확대되고 아래로 굴리면 축소된다', () => {
    const camera = { scale: 1, x: 0, y: 0 };
    const pointer = { x: 50, y: 50 };

    const zoomedIn = zoomCamera(camera, pointer, -100);
    const zoomedOut = zoomCamera(camera, pointer, 100);

    expect(zoomedIn.scale).toBeGreaterThan(1);
    expect(zoomedOut.scale).toBeLessThan(1);
  });
});

describe('zoomCameraTo', () => {
  it('targetScale로 정확히 맞춘다', () => {
    const camera = { scale: 2, x: 0, y: 0 };

    const result = zoomCameraTo(camera, { x: 50, y: 50 }, 1);

    expect(result.scale).toBe(1);
  });

  it('pointer가 가리키는 좌표는 배율이 바뀌어도 화면상 같은 위치에 남는다', () => {
    const camera = { scale: 2, x: 80, y: 40 };
    const pointer = { x: 150, y: 90 };

    const worldPoint = {
      x: (pointer.x - camera.x) / camera.scale,
      y: (pointer.y - camera.y) / camera.scale,
    };
    const result = zoomCameraTo(camera, pointer, 1);

    expect(worldPoint.x * result.scale + result.x).toBeCloseTo(pointer.x);
    expect(worldPoint.y * result.scale + result.y).toBeCloseTo(pointer.y);
  });
});

describe('computeBoardPinchZoom', () => {
  it('시작 거리 대비 지금 거리의 비율만큼 배율이 바뀐다', () => {
    const base = { scale: 1, x: 0, y: 0 };
    const start = { centroid: { x: 0, y: 0 }, distance: 20 };
    const current = { centroid: { x: 0, y: 0 }, distance: 50 };

    const result = computeBoardPinchZoom(base, start, current);

    expect(result.scale).toBeCloseTo(2.5);
  });

  it('제스처 시작 시점에 손가락 중점이 가리키던 좌표는, 지금 손가락 중점 위치로 그대로 따라온다', () => {
    const base = { scale: 1, x: 50, y: 30 };
    const start = { centroid: { x: 120, y: 80 }, distance: 40 };
    const current = { centroid: { x: 150, y: 100 }, distance: 80 };

    const worldPoint = {
      x: (start.centroid.x - base.x) / base.scale,
      y: (start.centroid.y - base.y) / base.scale,
    };
    const result = computeBoardPinchZoom(base, start, current);

    expect(worldPoint.x * result.scale + result.x).toBeCloseTo(current.centroid.x);
    expect(worldPoint.y * result.scale + result.y).toBeCloseTo(current.centroid.y);
  });

  it('배율이 상한(3배)을 넘으면 상한으로 고정된다', () => {
    const base = { scale: 1, x: 0, y: 0 };
    const start = { centroid: { x: 0, y: 0 }, distance: 10 };
    const current = { centroid: { x: 0, y: 0 }, distance: 1000 };

    const result = computeBoardPinchZoom(base, start, current);

    expect(result.scale).toBe(3);
  });

  it('배율이 하한(0.4배) 밑으로 내려가면 하한으로 고정된다', () => {
    const base = { scale: 1, x: 0, y: 0 };
    const start = { centroid: { x: 0, y: 0 }, distance: 1000 };
    const current = { centroid: { x: 0, y: 0 }, distance: 10 };

    const result = computeBoardPinchZoom(base, start, current);

    expect(result.scale).toBe(0.4);
  });

  it('시작 거리가 0이면(손가락이 겹친 상태) 나눗셈 대신 base를 그대로 반환한다', () => {
    const base = { scale: 1.5, x: 5, y: 5 };
    const start = { centroid: { x: 0, y: 0 }, distance: 0 };
    const current = { centroid: { x: 100, y: 100 }, distance: 50 };

    const result = computeBoardPinchZoom(base, start, current);

    expect(result).toEqual(base);
  });
});

describe('computeFocusTarget', () => {
  it('대상 지점들의 중심이 뷰포트 중앙에 오도록 카메라 위치를 계산한다', () => {
    const camera = { scale: 1, x: 999, y: 999 }; // 기존 위치와 무관하게 새로 계산됨을 보여주려고 임의값을 둠
    const targets = [
      { x: 100, y: 50 },
      { x: 300, y: 150 },
    ]; // 중심 (200, 100)
    const viewport = { width: 800, height: 600 };

    const result = computeFocusTarget(camera, targets, viewport);

    expect(result.x).toBe(200); // 400 - 200 * 1
    expect(result.y).toBe(200); // 300 - 100 * 1
  });

  it('현재 배율은 그대로 유지한다', () => {
    const camera = { scale: 2, x: 0, y: 0 };
    const targets = [{ x: 50, y: 50 }];
    const viewport = { width: 800, height: 600 };

    const result = computeFocusTarget(camera, targets, viewport);

    expect(result.scale).toBe(2);
  });
});
