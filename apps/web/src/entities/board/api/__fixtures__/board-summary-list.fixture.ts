import type { BoardSummaryList } from '../board-api';

import { boardFixture } from './board.fixture';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const PREVIEW_IMAGE_URLS = [
  '/board/stickers/cat.png',
  '/board/stickers/vinyl.png',
  '/board/stickers/girl.png',
  '/board/stickers/bench.png',
];

export const boardSummaryListFixture: BoardSummaryList = {
  counts: { all: 4, personal: 2, shared: 2 },
  boards: [
    {
      id: '01983f2a-3c4d-7e5f-a6b7-000000000001',
      name: '빈 보드',
      kind: 'PERSONAL',
      role: 'OWNER',
      stickerCount: 0,
      participantCount: 1,
      previewImageUrls: [],
      mainColor: null,
      lastActivityAt: ago(0),
      analysisStatus: null,
    },
    {
      id: boardFixture.id,
      name: boardFixture.name,
      kind: 'PERSONAL',
      role: 'OWNER',
      stickerCount: boardFixture.stickers.length,
      participantCount: 1,
      previewImageUrls: PREVIEW_IMAGE_URLS,
      mainColor: '#FC5A57',
      lastActivityAt: ago(2 * HOUR_MS),
      analysisStatus: null,
    },
    {
      id: '01983f2a-3c4d-7e5f-a6b7-000000000003',
      name: '여름 휴가',
      kind: 'SHARED',
      role: 'OWNER',
      stickerCount: 32,
      participantCount: 4,
      previewImageUrls: PREVIEW_IMAGE_URLS.slice(0, 3),
      mainColor: '#3D74CE',
      lastActivityAt: ago(DAY_MS),
      analysisStatus: 'ANALYZING',
    },
    {
      id: '01983f2a-3c4d-7e5f-a6b7-000000000004',
      name: '동아리',
      kind: 'SHARED',
      role: 'MEMBER',
      stickerCount: 53,
      participantCount: 5,
      previewImageUrls: PREVIEW_IMAGE_URLS,
      mainColor: '#E79E3E',
      lastActivityAt: ago(14 * DAY_MS),
      analysisStatus: null,
    },
  ],
};
