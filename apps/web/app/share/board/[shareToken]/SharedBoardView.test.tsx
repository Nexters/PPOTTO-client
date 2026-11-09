import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SharedBoard } from '@/entities/board/api/board-api';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
// jsdom에는 ResizeObserver가 없다. 보드 영역 크기 측정만 하므로 동작 없는 대체로 둔다
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    disconnect() {}
  },
);

import { SharedBoardView } from './SharedBoardView';

const sticker = {
  id: '01990000-0000-7000-8000-000000000004',
  title: '언제까지 일해요',
  isNew: false,
  type: 'TEXT',
  textContent: 'whats in my mac',
  posX: 120,
  posY: 200,
  scale: 1,
  rotation: 0,
  zIndex: 1,
  badgeOffsetX: 0,
  badgeOffsetY: 0,
  badgeRotation: 0,
} satisfies SharedBoard['stickers'][number];

function board(overrides: Partial<SharedBoard> = {}): SharedBoard {
  return {
    boardName: '제주 여행',
    sharerName: '김용희',
    scope: 'RECAP',
    stickers: [sticker],
    drawings: [],
    ...overrides,
  };
}

describe('SharedBoardView', () => {
  it('공유자와 보드 이름, 스티커 수를 보여준다', () => {
    render(<SharedBoardView shareToken="token" board={board()} />);

    expect(screen.getByText('김용희님의 제주 여행')).toBeInTheDocument();
    expect(screen.getByText('스티커 1개')).toBeInTheDocument();
    expect(screen.queryByText('아직 스티커가 없어요')).not.toBeInTheDocument();
  });

  it('스티커가 없으면 빈 상태를 보여준다', () => {
    render(<SharedBoardView shareToken="token" board={board({ stickers: [] })} />);

    expect(screen.getByText('스티커 0개')).toBeInTheDocument();
    expect(screen.getByText('아직 스티커가 없어요')).toBeInTheDocument();
  });
});
