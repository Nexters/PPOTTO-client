import { HttpError } from '@ppotto/api';

export function getBoardJoinErrorMessage(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 404) return '유효하지 않거나 만료된 초대예요';
    if (error.status === 409) return '참여 인원이 모두 찼어요';
  }
  return '보드에 참여하지 못했어요';
}

export function isTerminalBoardJoinError(error: unknown) {
  return error instanceof HttpError && (error.status === 404 || error.status === 409);
}
