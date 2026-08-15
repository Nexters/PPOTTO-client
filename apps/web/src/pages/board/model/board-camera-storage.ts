import type { CameraState } from './board-camera';

const getBoardCameraKey = (boardId: string) => `ppotto:board-camera:${boardId}`;

export function loadSavedCamera(boardId: string): CameraState | null {
  const raw = localStorage.getItem(getBoardCameraKey(boardId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CameraState;
  } catch {
    return null;
  }
}

export function saveCamera(boardId: string, camera: CameraState): void {
  localStorage.setItem(getBoardCameraKey(boardId), JSON.stringify(camera));
}
