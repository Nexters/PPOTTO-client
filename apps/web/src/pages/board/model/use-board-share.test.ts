import { act, renderHook } from '@testing-library/react';
import { BridgeUnknownMessageError } from 'webview-bridge-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBoardShare } from './use-board-share';

const mocks = vi.hoisted(() => ({
  shareStatus: undefined as { shareToken: string | null; scope: 'RECAP' } | undefined,
  shareBoardAsync: vi.fn(),
  bridgeRequest: vi.fn(),
  toast: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock('@/entities/board/api/board-queries', () => ({
  useBoardQuery: () => ({
    data: { stickers: [{ title: '바이닐 숲속' }, { title: null }, { title: '동물 밈 맹꼼' }] },
  }),
  useBoardShareStatusQuery: () => ({ data: mocks.shareStatus }),
}));
vi.mock('@/entities/board/api/board-mutations', () => ({
  useShareBoardMutation: () => ({ mutate: vi.fn(), mutateAsync: mocks.shareBoardAsync }),
}));
vi.mock('@/entities/user/api/user-queries', () => ({
  useMeQuery: () => ({ data: { name: '김용희' } }),
}));
vi.mock('@/shared/lib/bridge', () => ({ bridge: { request: mocks.bridgeRequest } }));
vi.mock('@/shared/lib/capture-element-as-blob', () => ({
  captureElementAsBlob: () => Promise.resolve(new Blob(['png'], { type: 'image/png' })),
}));
vi.mock('@/shared/ui/common/Toast', () => ({ useToast: () => mocks.toast }));

function renderShare() {
  const { result } = renderHook(() => useBoardShare('board-1', true));
  result.current.cardRef.current = document.createElement('div');
  return result;
}

describe('useBoardShare 카카오톡 공유', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.shareStatus = { shareToken: 'token-1', scope: 'RECAP' };
    mocks.uploadImage.mockResolvedValue({
      infos: { original: { url: 'https://k.kakaocdn.net/a.png' } },
    });
    mocks.bridgeRequest.mockResolvedValue({ success: true });
    window.Kakao = { Share: { uploadImage: mocks.uploadImage } } as unknown as Window['Kakao'];
  });

  it('이미 있는 공유 링크로 보드 템플릿 공유를 요청한다', async () => {
    const result = renderShare();

    let success = false;
    await act(async () => {
      success = await result.current.shareKakao('제주 여행');
    });

    expect(success).toBe(true);
    expect(mocks.shareBoardAsync).not.toHaveBeenCalled();
    expect(mocks.bridgeRequest).toHaveBeenCalledWith('SHARE_KAKAO_BOARD', {
      templateArgs: {
        IMAGE_URL: 'https://k.kakaocdn.net/a.png',
        USER_NAME: '김용희',
        BOARD_NAME: '제주 여행',
        STICKER_NAMES: '바이닐 숲속, 동물 밈 맹꼼',
        WEB_LINK: `${window.location.origin}/share/board/token-1`,
      },
    });
  });

  it('공유한 적 없는 보드는 지금 범위로 저장해 링크를 만든다', async () => {
    mocks.shareStatus = { shareToken: null, scope: 'RECAP' };
    mocks.shareBoardAsync.mockResolvedValue({ shareToken: 'new-token', scope: 'RECAP' });
    const result = renderShare();

    await act(async () => {
      await result.current.shareKakao('제주 여행');
    });

    expect(mocks.shareBoardAsync).toHaveBeenCalledWith({ boardId: 'board-1', scope: 'RECAP' });
    expect(mocks.bridgeRequest.mock.calls[0]![1].templateArgs.WEB_LINK).toBe(
      `${window.location.origin}/share/board/new-token`,
    );
  });

  it('공유 상태를 받기 전에는 보내지 않는다', async () => {
    mocks.shareStatus = undefined;
    const result = renderShare();

    let success = true;
    await act(async () => {
      success = await result.current.shareKakao('제주 여행');
    });

    expect(success).toBe(false);
    expect(mocks.bridgeRequest).not.toHaveBeenCalled();
  });

  it('보드 공유를 모르는 구버전 앱이면 업데이트를 안내한다', async () => {
    mocks.bridgeRequest.mockRejectedValue(
      new BridgeUnknownMessageError('SHARE_KAKAO_BOARD', 'request'),
    );
    const result = renderShare();

    await act(async () => {
      await result.current.shareKakao('제주 여행');
    });

    expect(mocks.toast).toHaveBeenCalledWith('앱을 업데이트하면 카카오톡으로 공유할 수 있어요');
  });
});
