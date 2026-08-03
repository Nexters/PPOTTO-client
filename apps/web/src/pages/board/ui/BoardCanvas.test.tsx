/**
 * 동작 범위 (2026-08-04 인터뷰)
 *
 * 제외: 새 스티커 추가/혼합 배치(일부는 배치됨 + 일부는 신규) — 별도 기능, 슬롯·zIndex 재계산 설계 필요
 * 제외: 리페치 시 중복 저장 방지 — TanStack Query 구조적 공유로 실제론 완화되나, mock 기반 유닛 테스트로는 검증 불가
 * 제외: 로딩/에러 문구 렌더링 — 임시로 작성한 문구라 디자인 미확정
 *
 * [팀확인] 스티커 새로 생성 시 기존 배치된 스티커를 자동으로 구석에 재배치하는지 — 기획 확인 대기
 * [팀확인] 새로 생성된 스티커끼리 모아서 배치해야 하는지, 빈 곳 아무데나 둬도 되는지 — 기획/디자인 확인 대기
 *
 * 검증 지점 이동 — 아래는 여기서 다시 보지 않는다.
 *   배치 좌표·zIndex·badgeOffsetY 계산 규칙 → board-layout.test.ts
 */
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { useBoardQuery } from '@/entities/board/api/board-queries';

import { BoardCanvas } from './BoardCanvas';

// jsdom엔 ResizeObserver가 없어서(BoardCanvas가 컨테이너 너비 관찰에 사용) 최소 스텁으로 대체한다.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// jsdom엔 실제 canvas가 없어 react-konva Stage/Layer를 그대로 렌더링할 수 없다. 이 테스트의 관심사는 저장 분기 로직이지 캔버스 렌더링이 아니므로 최소 스텁으로 대체한다.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

// Sticker 자체 렌더링(이미지/뱃지)은 이 테스트의 관심사가 아니다.
vi.mock('./Sticker', () => ({
  Sticker: () => null,
}));

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ push: vi.fn() }),
}));

vi.mock('@/entities/board/api/board-queries', () => ({
  useBoardQuery: vi.fn(),
}));

vi.mock('@/entities/board/api/board-mutations', () => ({
  useUpdateBoardLayoutMutation: vi.fn(),
}));

function fakeApiSticker(
  overrides: Partial<BoardDetail['stickers'][number]> = {},
): BoardDetail['stickers'][number] {
  return {
    id: 'sticker-1',
    type: 'IMAGE',
    title: '스티커',
    isNew: false,
    imageUrl: null,
    textContent: null,
    posX: 0,
    posY: 0,
    rotation: 0,
    scale: 1,
    zIndex: 1,
    badgeOffsetX: 0,
    badgeOffsetY: 0,
    badgeRotation: 0,
    ...overrides,
  };
}

function mockBoardData(stickers: BoardDetail['stickers']) {
  vi.mocked(useBoardQuery).mockReturnValue({
    data: { id: 'board-1', name: '보드', drawings: [], stickers },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useBoardQuery>);
}

afterEach(() => {
  cleanup();
});

describe('초기 배치 저장 분기', () => {
  let saveLayout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    saveLayout = vi.fn();
    vi.mocked(useUpdateBoardLayoutMutation).mockReturnValue({
      mutate: saveLayout,
    } as unknown as ReturnType<typeof useUpdateBoardLayoutMutation>);
  });

  it('미배치 보드(스티커 전부 0,0)면 계산된 배치를 저장 API로 저장한다', async () => {
    mockBoardData([
      fakeApiSticker({ id: 'a', posX: 0, posY: 0 }),
      fakeApiSticker({ id: 'b', posX: 0, posY: 0 }),
    ]);

    render(<BoardCanvas boardId="board-1" />);

    await waitFor(() => expect(saveLayout).toHaveBeenCalledTimes(1));
    expect(saveLayout).toHaveBeenCalledWith({
      boardId: 'board-1',
      input: {
        stickers: expect.arrayContaining([
          expect.objectContaining({ id: 'a' }),
          expect.objectContaining({ id: 'b' }),
        ]),
      },
    });
  });

  it('이미 배치된 보드(posX/posY가 0이 아님)면 저장 API를 호출하지 않는다', () => {
    mockBoardData([
      fakeApiSticker({ id: 'a', posX: 120, posY: 300 }),
      fakeApiSticker({ id: 'b', posX: 250, posY: 400 }),
    ]);

    render(<BoardCanvas boardId="board-1" />);

    expect(saveLayout).not.toHaveBeenCalled();
  });

  it('저장 요청이 실패해도 화면이 깨지지 않는다', async () => {
    saveLayout.mockRejectedValue(new Error('network error'));
    mockBoardData([fakeApiSticker({ id: 'a', posX: 0, posY: 0 })]);

    const { container } = render(<BoardCanvas boardId="board-1" />);

    await waitFor(() => expect(saveLayout).toHaveBeenCalledTimes(1));
    expect(container).not.toBeEmptyDOMElement();
  });
});
