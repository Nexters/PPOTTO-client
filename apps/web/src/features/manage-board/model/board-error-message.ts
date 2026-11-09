import { HttpError } from '@ppotto/api';

export const BOARD_ANALYZING_MESSAGE = '분석이 진행 중인 보드는 삭제할 수 없어요';

const BOARD_ERROR_MESSAGES: Record<string, string> = {
  'BOARD-003': '보드는 최대 100개까지 만들 수 있어요',
  'BOARD-004': '보드가 하나뿐이라 삭제할 수 없어요',
  'BOARD-005': BOARD_ANALYZING_MESSAGE,
};

export const getBoardErrorMessage = (error: unknown, fallback: string) =>
  (error instanceof HttpError && error.code && BOARD_ERROR_MESSAGES[error.code]) || fallback;
