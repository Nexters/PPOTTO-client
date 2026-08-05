/**
 * 동작 범위 (2026-08-04 인터뷰, 2026-08-05 재구성)
 *
 * 제외: 리페치 시 중복 저장 방지 — TanStack Query 구조적 공유로 실제론 완화되나, mock 기반 유닛 테스트로는 검증 불가
 * 제외: 로딩/에러 문구 렌더링 — 임시로 작성한 문구라 디자인 미확정
 * 제외: 새 스티커 배치 시 카메라 포커스 애니메이션 — Stage/Layer를 렌더링용 div로 스텁하고 있어 카메라
 *   x/y가 화면에 드러나지 않음. 포커스 대상 계산(중심점, 배율 유지) 자체는 board-camera.test.ts에서 검증함
 *
 * "새 스티커 추가/혼합 배치"(일부는 배치됨 + 일부는 신규)는 이제 지원 대상이다 — 기존 스티커는
 * 재배치하지 않고, 새 스티커만 빈 공간을 찾아 뭉쳐서 배치한다.
 *
 * 검증 지점 이동 — 아래는 여기서 다시 보지 않는다.
 *   빈 공간 탐색·군집·회전·zIndex 등 배치 계산 규칙 → board-layout.test.ts
 *   포커스 대상 계산(중심점, 배율 유지) 규칙 → board-camera.test.ts
 */
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BoardDetail } from '@/entities/board/api/board-api';
import { useUpdateBoardLayoutMutation } from '@/entities/board/api/board-mutations';
import { useBoardQuery } from '@/entities/board/api/board-queries';

import { BoardCanvas } from './BoardCanvas';

// jsdom엔 ResizeObserver가 없어서(BoardCanvas가 컨테이너 크기 관찰에 사용) 최소 스텁으로 대체한다.
// BoardCanvas가 이제 뷰포트 크기를 알아야 배치를 계산하므로(뷰포트 중앙 앵커), observe() 즉시 가짜 크기를 콜백으로 흘려보낸다.
class ResizeObserverStub {
  #callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }

  observe() {
    const entry = { contentRect: { width: 800, height: 600 } } as ResizeObserverEntry;
    this.#callback([entry], this as unknown as ResizeObserver);
  }

  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// jsdom엔 requestAnimationFrame이 없어서(BoardCanvas가 카메라 포커스 애니메이션에 사용) 최소 스텁으로 대체한다.
vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
  setTimeout(() => callback(performance.now()), 0),
);
vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

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
