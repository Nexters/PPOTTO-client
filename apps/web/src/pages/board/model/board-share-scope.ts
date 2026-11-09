import type { BoardShareScope } from '@/entities/board/api/board-api';

export type { BoardShareScope };

export const BOARD_SHARE_SCOPES: BoardShareScope[] = ['BOARD', 'RECAP', 'PHOTOS'];

export const boardShareScopeLabels: Record<BoardShareScope, string> = {
  BOARD: '보드만',
  RECAP: '리캡까지',
  PHOTOS: '테마 속 사진까지',
};
