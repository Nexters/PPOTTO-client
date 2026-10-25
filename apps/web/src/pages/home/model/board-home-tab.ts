import type { BoardSummary, BoardSummaryList } from '@/entities/board/api/board-api';

export type BoardHomeTab = 'ALL' | BoardSummary['kind'];

export const BOARD_HOME_TABS = [
  { tab: 'ALL', label: '전체' },
  { tab: 'PERSONAL', label: '개인 보드' },
  { tab: 'SHARED', label: '공유 보드' },
] as const satisfies readonly { tab: BoardHomeTab; label: string }[];

const COUNT_KEY = {
  ALL: 'all',
  PERSONAL: 'personal',
  SHARED: 'shared',
} as const satisfies Record<BoardHomeTab, keyof BoardSummaryList['counts']>;

export const countBoardsInTab = (counts: BoardSummaryList['counts'], tab: BoardHomeTab) =>
  counts[COUNT_KEY[tab]];

export const filterBoardsByTab = (boards: BoardSummary[], tab: BoardHomeTab) =>
  tab === 'ALL' ? boards : boards.filter((board) => board.kind === tab);
