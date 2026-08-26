import { useCallback, useEffect, useRef, useState } from 'react';

import type { CameraState } from './board-camera';
import { loadSavedCamera, saveCamera } from './board-camera-storage';

// 카메라 위치를 저장한 뒤 실제로 로컬스토리지에 쓰기까지 기다리는 디바운스 시간(ms)
const CAMERA_SAVE_DEBOUNCE_MS = 400;
// 포커스 대상으로 카메라가 부드럽게 이동하는 시간(ms)
const FOCUS_ANIMATION_MS = 350;

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

// 카메라 상태의 소유·영속화(로컬스토리지)·포커스 애니메이션만 담당한다. 팬/핀치/휠 등
// 실시간 조작은 BoardCanvas가 이 훅이 내주는 camera/setCamera/cameraRef를 그대로 갖다 쓴다.
export function useBoardCamera(boardId: string) {
  const [camera, setCamera] = useState<CameraState>(
    () => loadSavedCamera(boardId) ?? { scale: 1, x: 0, y: 0 },
  );
  const cameraRef = useRef(camera);
  const focusFrameRef = useRef<number | null>(null);

  useEffect(() => {
    cameraRef.current = camera;
  });

  useEffect(() => {
    const timer = setTimeout(() => saveCamera(boardId, camera), CAMERA_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [boardId, camera]);

  useEffect(() => {
    return () => saveCamera(boardId, cameraRef.current);
  }, [boardId]);

  useEffect(() => {
    return () => {
      if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
    };
  }, []);

  // target으로 카메라를 부드럽게 이동시킨다. 이미 진행 중인 포커스 애니메이션이 있으면 취소하고 새로 시작한다.
  // ref만 참조해서 렌더와 무관하게 항상 같은 함수 정체성을 유지한다 — 호출자가 deps 배열에 넣어도 안전
  const requestFocus = useCallback((target: CameraState) => {
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);

    const startCamera = cameraRef.current;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / FOCUS_ANIMATION_MS, 1);
      const eased = easeOutCubic(progress);
      setCamera({
        scale: startCamera.scale + (target.scale - startCamera.scale) * eased,
        x: startCamera.x + (target.x - startCamera.x) * eased,
        y: startCamera.y + (target.y - startCamera.y) * eased,
      });
      focusFrameRef.current = progress < 1 ? requestAnimationFrame(animate) : null;
    };
    focusFrameRef.current = requestAnimationFrame(animate);
  }, []);

  return { camera, setCamera, cameraRef, requestFocus };
}
