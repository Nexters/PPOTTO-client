export type CameraState = {
  scale: number;
  x: number;
  y: number;
};

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

// 핀치 두 터치 포인트를 zoomCamera가 쓸 수 있는 중심점·배율 변화량(deltaY 상당값)으로 변환한다.
export function pinchToZoomParams(
  previous: [{ x: number; y: number }, { x: number; y: number }],
  current: [{ x: number; y: number }, { x: number; y: number }],
): { pointer: { x: number; y: number }; deltaY: number } {
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const previousDistance = distance(previous[0], previous[1]);
  const currentDistance = distance(current[0], current[1]);

  const pointer = {
    x: (current[0].x + current[1].x) / 2,
    y: (current[0].y + current[1].y) / 2,
  };

  // 손가락 사이가 벌어지면(확대 의도) zoomCamera 기준 음수 deltaY(확대)가 나와야 한다.
  const deltaY = previousDistance - currentDistance;

  return { pointer, deltaY };
}
