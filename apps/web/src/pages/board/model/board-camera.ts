import { centroid, clamp, type Point } from './geometry';

export type CameraState = {
  scale: number;
  x: number;
  y: number;
};

export const BOARD_ZOOM_MIN = 0.4;
export const BOARD_ZOOM_MAX = 3;

const ZOOM_SPEED = 1.05;

// 일반 휠/두 손가락 스크롤 — delta만큼 카메라 위치를 이동시킨다.
export function panCamera(camera: CameraState, delta: { x: number; y: number }): CameraState {
  return { ...camera, x: camera.x + delta.x, y: camera.y + delta.y };
}

// Ctrl+휠 또는 트랙패드 핀치 — pointer가 가리키는 좌표를 화면상 같은 위치에 고정한 채 확대·축소한다.
// deltaY가 음수(휠 위로)면 확대, 양수(휠 아래로)면 축소한다.
export function zoomCamera(
  camera: CameraState,
  pointer: { x: number; y: number },
  deltaY: number,
): CameraState {
  const worldPoint = {
    x: (pointer.x - camera.x) / camera.scale,
    y: (pointer.y - camera.y) / camera.scale,
  };

  const newScale = deltaY < 0 ? camera.scale * ZOOM_SPEED : camera.scale / ZOOM_SPEED;

  return {
    scale: newScale,
    x: pointer.x - worldPoint.x * newScale,
    y: pointer.y - worldPoint.y * newScale,
  };
}

// 새로 배치된 스티커 무리의 중심이 뷰포트 중앙에 오는 카메라 상태를 계산한다.
export function computeFocusTarget(
  camera: CameraState,
  targets: Point[],
  viewport: { width: number; height: number },
): CameraState {
  const center = centroid(targets);
  return {
    scale: camera.scale,
    x: viewport.width / 2 - center.x * camera.scale,
    y: viewport.height / 2 - center.y * camera.scale,
  };
}

// 화면 좌표를 보드 world 좌표로 변환한다
export function toWorldPoint(camera: CameraState, point: Point): Point {
  return {
    x: (point.x - camera.x) / camera.scale,
    y: (point.y - camera.y) / camera.scale,
  };
}

// 핀치로 보드를 확대/축소한다.
export function computeBoardPinchZoom(
  base: CameraState,
  start: { centroid: Point; distance: number },
  current: { centroid: Point; distance: number },
): CameraState {
  if (start.distance === 0) return base;

  const scale = clamp(
    base.scale * (current.distance / start.distance),
    BOARD_ZOOM_MIN,
    BOARD_ZOOM_MAX,
  );
  const worldX = (start.centroid.x - base.x) / base.scale;
  const worldY = (start.centroid.y - base.y) / base.scale;

  return {
    scale,
    x: current.centroid.x - worldX * scale,
    y: current.centroid.y - worldY * scale,
  };
}
