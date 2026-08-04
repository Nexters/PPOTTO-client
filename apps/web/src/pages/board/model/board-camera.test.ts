/**
 * 동작 범위 (2026-08-05 인터뷰)
 *
 * 제외: 줌 배율 최소/최대 제한 — 사유: 기획 미정, 이번엔 제한 없이 진행
 *
 * 카메라 상태(배율·위치)는 서버에 저장하지 않고 화면을 나갔다 들어오면 초기화되므로 별도 테스트 없음.
 * `pinchToZoomParams`(핀치 두 터치 포인트 → 중심점·배율 변화량 변환)는 정책 판단 없는 단순 기하
 * 계산이라 이번엔 테스트 없이 구현만 한다.
 */
import { describe, expect, it } from 'vitest';

import { panCamera, zoomCamera } from './board-camera';

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
