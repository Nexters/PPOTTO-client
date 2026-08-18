import { clamp, type Point } from './geometry';

export type CameraState = {
  scale: number;
  x: number;
  y: number;
};

export const BOARD_ZOOM_MIN = 0.25;
export const BOARD_ZOOM_MAX = 3;
export const DOT_FADE_START_ZOOM = 0.4;

const ZOOM_SPEED = 1.05;
// 화면에 꽉 채우지 않고 살짝 여백을 두기 위한 배율 (1=딱 맞음). 첫 시도값이라 실제로 보면서 조정 필요할 수 있음
const FIT_MARGIN = 0.85;

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

// 대상 지점들을 감싸는 사각형(AABB)이 뷰포트 안에 들어오도록 카메라 위치와 배율을 계산한다.
// targets는 스티커 이미지 자체의 외곽 지점만 넘겨야 한다 — 뱃지(제목)는 줌과 무관하게 화면상
// 고정 크기를 유지할 예정이라 이 계산에 포함하지 않는다.
// 기본 줌보다 더 확대되지는 않고(첫 배치 등 무리가 작을 때 과도하게 줌인되는 것 방지),
// 필요할 때만 줌아웃해서 다 담는 방향으로 동작한다.
export function computeFocusTarget(
  camera: CameraState,
  targets: Point[],
  viewport: { width: number; height: number },
): CameraState {
  const xs = targets.map((point) => point.x);
  const ys = targets.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;
  // 점이 하나뿐이라 폭/높이가 0이면 나눗셈 결과가 Infinity가 되어, 아래에서 줌 변경 없이 유지된다
  const fitScale = Math.min(viewport.width / boxWidth, viewport.height / boxHeight) * FIT_MARGIN;
  const scale = clamp(Math.min(fitScale, camera.scale), BOARD_ZOOM_MIN, BOARD_ZOOM_MAX);

  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

  return {
    scale,
    x: viewport.width / 2 - center.x * scale,
    y: viewport.height / 2 - center.y * scale,
  };
}

// 화면 좌표를 보드 world 좌표로 변환한다
export function toWorldPoint(camera: CameraState, point: Point): Point {
  return {
    x: (point.x - camera.x) / camera.scale,
    y: (point.y - camera.y) / camera.scale,
  };
}

// pointer가 가리키는 좌표를 화면상 같은 위치에 고정한 채 정확히 targetScale로 맞춘다 (더블탭 줌 리셋 등)
export function zoomCameraTo(
  camera: CameraState,
  pointer: Point,
  targetScale: number,
): CameraState {
  const worldPoint = toWorldPoint(camera, pointer);

  return {
    scale: targetScale,
    x: pointer.x - worldPoint.x * targetScale,
    y: pointer.y - worldPoint.y * targetScale,
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
