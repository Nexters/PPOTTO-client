import { expect, it } from 'vitest';

import type { BoardSummary } from '@/entities/board/api/board-api';

import { countBoardsInTab, filterBoardsByTab } from './board-home-tab';

const fakeBoard = (overrides: Partial<BoardSummary>): BoardSummary => ({
  id: 'board',
  name: '보드',
  kind: 'PERSONAL',
  role: 'OWNER',
  stickerCount: 0,
  participantCount: 1,
  previewImageUrls: [],
  mainColor: null,
  lastActivityAt: '2026-10-25T12:00:00Z',
  analysisStatus: null,
  ...overrides,
});

const personalA = fakeBoard({ id: 'personal-a', kind: 'PERSONAL' });
const shared = fakeBoard({ id: 'shared', kind: 'SHARED' });
const personalB = fakeBoard({ id: 'personal-b', kind: 'PERSONAL' });
const boards = [personalA, shared, personalB];

it('전체 탭은 서버 순서 그대로 모든 보드를 보여준다', () => {
  expect(filterBoardsByTab(boards, 'ALL')).toEqual([personalA, shared, personalB]);
});

it('개인 보드 탭은 개인 보드만 서버 순서대로 보여준다', () => {
  expect(filterBoardsByTab(boards, 'PERSONAL')).toEqual([personalA, personalB]);
});

it('공유 보드 탭은 공유 보드만 보여준다', () => {
  expect(filterBoardsByTab(boards, 'SHARED')).toEqual([shared]);
});

it.each([
  ['ALL', 10],
  ['PERSONAL', 4],
  ['SHARED', 6],
] as const)('%s 탭 개수는 목록 길이가 아니라 서버 counts 값을 쓴다', (tab, expected) => {
  expect(countBoardsInTab({ all: 10, personal: 4, shared: 6 }, tab)).toBe(expected);
});
