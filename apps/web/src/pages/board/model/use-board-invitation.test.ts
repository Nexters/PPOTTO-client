import { act, renderHook } from '@testing-library/react';
import { BridgeUnknownMessageError } from 'webview-bridge-kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mutateAsync,
  uploadPreview,
  captureElement,
  toast,
  writeText,
  bridgeRequest,
  kakaoUploadImage,
} = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  uploadPreview: vi.fn(),
  captureElement: vi.fn(),
  toast: vi.fn(),
  writeText: vi.fn(),
  bridgeRequest: vi.fn(),
  kakaoUploadImage: vi.fn(),
}));

vi.mock('@/entities/board/api/board-mutations', () => ({
  useIssueBoardInvitationMutation: () => ({ mutateAsync, isPending: false }),
  useUploadBoardInvitationPreviewMutation: () => ({ mutateAsync: uploadPreview }),
}));
vi.mock('@/entities/board/api/board-queries', () => ({
  useBoardQuery: () => ({ data: { name: '제주 여행' } }),
}));
vi.mock('@/entities/user/api/user-queries', () => ({
  useMeQuery: () => ({ data: { name: '김용희' } }),
}));
vi.mock('@/shared/lib/bridge', () => ({ bridge: { request: bridgeRequest } }));
vi.mock('@/shared/lib/capture-element-as-blob', () => ({ captureElementAsBlob: captureElement }));
vi.mock('@/shared/lib/copy-text-to-clipboard', () => ({
  copyTextToClipboard: writeText,
}));
vi.mock('@/shared/ui/common/Toast', () => ({ useToast: () => toast }));

import { useBoardInvitation } from './use-board-invitation';

describe('useBoardInvitation', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    uploadPreview.mockReset();
    captureElement.mockReset();
    toast.mockReset();
    writeText.mockReset();
    bridgeRequest.mockReset();
    kakaoUploadImage.mockReset();
    window.Kakao = { Share: { uploadImage: kakaoUploadImage } } as unknown as Window['Kakao'];
  });

  afterEach(() => {
    window.Kakao = undefined;
  });

  it('발급에 성공하면 초대 정보를 반환한다', async () => {
    const invitation = { code: 'K7P2QX' };
    mutateAsync.mockResolvedValue(invitation);
    const { result } = renderHook(() => useBoardInvitation('board-1'));

    const issued = await act(() => result.current.issueInvitation());

    expect(mutateAsync).toHaveBeenCalledWith('board-1');
    expect(issued).toBe(invitation);
  });

  it('새 미리보기가 필요하면 화면을 WebP로 캡처해 업로드한다', async () => {
    const invitation = {
      code: 'K7P2QX',
      invitationId: 'invitation-1',
      previewRequired: true,
    };
    const file = new Blob(['preview'], { type: 'image/webp' });
    mutateAsync.mockResolvedValue(invitation);
    captureElement.mockResolvedValue(file);
    uploadPreview.mockResolvedValue({ previewImageUrl: 'https://example.com/preview.webp' });
    const { result } = renderHook(() => useBoardInvitation('board-1'));
    const element = document.createElement('div');
    result.current.previewRef.current = element;

    await act(() => result.current.issueInvitation());
    await vi.waitFor(() =>
      expect(uploadPreview).toHaveBeenCalledWith({
        invitationId: 'invitation-1',
        code: 'K7P2QX',
        file,
      }),
    );

    expect(captureElement).toHaveBeenCalledWith(
      element,
      { skipFonts: true, pixelRatio: 2 },
      { type: 'image/webp', quality: 0.9 },
    );
  });

  it('발급에 실패하면 오류를 안내하고 null을 반환한다', async () => {
    mutateAsync.mockRejectedValue(new Error('failed'));
    const { result } = renderHook(() => useBoardInvitation('board-1'));

    const issued = await act(() => result.current.issueInvitation());

    expect(toast).toHaveBeenCalledWith('초대 코드를 불러오지 못했어요');
    expect(issued).toBeNull();
  });

  it('보드 ID가 없으면 발급하지 않는다', async () => {
    const { result } = renderHook(() => useBoardInvitation());

    const issued = await act(() => result.current.issueInvitation());

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(issued).toBeNull();
  });

  it('초대 코드를 클립보드에 복사하고 완료를 안내한다', async () => {
    writeText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBoardInvitation('board-1'));

    await act(() => result.current.copyInvitationCode('K7P2QX'));

    expect(writeText).toHaveBeenCalledWith('K7P2QX');
    expect(toast).toHaveBeenCalledWith('초대 코드를 복사했어요');
  });

  it('초대 코드 복사에 실패하면 오류를 안내한다', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const { result } = renderHook(() => useBoardInvitation('board-1'));

    await act(() => result.current.copyInvitationCode('K7P2QX'));

    expect(toast).toHaveBeenCalledWith('초대 코드를 복사하지 못했어요');
  });

  it('카카오톡 공유 시 화면을 캡처해 업로드하고 템플릿 인자와 함께 전송한다', async () => {
    const file = new Blob(['card'], { type: 'image/png' });
    captureElement.mockResolvedValue(file);
    kakaoUploadImage.mockResolvedValue({
      infos: { original: { url: 'https://k.kakao/invite.png' } },
    });
    bridgeRequest.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useBoardInvitation('board-1'));
    const element = document.createElement('div');
    result.current.kakaoCardRef.current = element;

    act(() => result.current.shareToKakao('K7P2QX'));

    await vi.waitFor(() =>
      expect(bridgeRequest).toHaveBeenCalledWith('SHARE_KAKAO_INVITATION', {
        templateArgs: {
          IMAGE_URL: 'https://k.kakao/invite.png',
          INVITER_NAME: '김용희',
          BOARD_NAME: '제주 여행',
          CODE: 'K7P2QX',
          WEB_LINK: 'invitations/K7P2QX',
        },
      }),
    );
  });

  it('인스타그램 공유 시 공개 초대 링크를 네이티브에 전달한다', async () => {
    bridgeRequest.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useBoardInvitation('board-1'));

    act(() => result.current.shareToInstagram('K7P2QX'));

    await vi.waitFor(() =>
      expect(bridgeRequest).toHaveBeenCalledWith('SHARE_INSTAGRAM_INVITATION', {
        url: 'https://ppotto.co.kr/invitations/K7P2QX',
      }),
    );
  });

  it('인스타그램 초대 공유를 모르는 구버전 앱이면 업데이트를 안내한다', async () => {
    bridgeRequest.mockRejectedValue(
      new BridgeUnknownMessageError('SHARE_INSTAGRAM_INVITATION', 'request'),
    );
    const { result } = renderHook(() => useBoardInvitation('board-1'));

    act(() => result.current.shareToInstagram('K7P2QX'));

    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith('앱을 업데이트하면 인스타그램으로 공유할 수 있어요'),
    );
  });

  it('카카오 SDK가 없으면 공유하지 않는다', async () => {
    window.Kakao = undefined;
    const { result } = renderHook(() => useBoardInvitation('board-1'));
    result.current.kakaoCardRef.current = document.createElement('div');

    act(() => result.current.shareToKakao('K7P2QX'));

    expect(captureElement).not.toHaveBeenCalled();
    expect(bridgeRequest).not.toHaveBeenCalled();
  });

  it('카카오톡 공유에 실패하면 오류를 안내한다', async () => {
    captureElement.mockResolvedValue(new Blob(['card'], { type: 'image/png' }));
    kakaoUploadImage.mockResolvedValue({
      infos: { original: { url: 'https://k.kakao/invite.png' } },
    });
    bridgeRequest.mockResolvedValue({ success: false });
    const { result } = renderHook(() => useBoardInvitation('board-1'));
    result.current.kakaoCardRef.current = document.createElement('div');

    act(() => result.current.shareToKakao('K7P2QX'));

    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith('카카오톡 공유에 실패했어요'));
  });

  it('초대 공유를 모르는 구버전 앱이면 업데이트를 안내한다', async () => {
    captureElement.mockResolvedValue(new Blob(['card'], { type: 'image/png' }));
    kakaoUploadImage.mockResolvedValue({
      infos: { original: { url: 'https://k.kakao/invite.png' } },
    });
    bridgeRequest.mockRejectedValue(
      new BridgeUnknownMessageError('SHARE_KAKAO_INVITATION', 'request'),
    );
    const { result } = renderHook(() => useBoardInvitation('board-1'));
    result.current.kakaoCardRef.current = document.createElement('div');

    act(() => result.current.shareToKakao('K7P2QX'));

    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith('앱을 업데이트하면 카카오톡으로 공유할 수 있어요'),
    );
  });
});
