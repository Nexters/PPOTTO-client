const getFirstUploadCompletedKey = (userId: string) => `ppotto:first-upload-completed:${userId}`;

/** 보드에 스티커가 생긴 적이 있는지 — 사진 선택의 initial/additional 모드 분기 기준 */
export const hasCompletedFirstUpload = (userId: string) =>
  localStorage.getItem(getFirstUploadCompletedKey(userId)) === '1';

export const markFirstUploadCompleted = (userId: string) =>
  localStorage.setItem(getFirstUploadCompletedKey(userId), '1');
