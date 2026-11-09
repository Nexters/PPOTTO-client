import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mutateAsync, uploadPreview, captureElement, toast, writeText } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  uploadPreview: vi.fn(),
  captureElement: vi.fn(),
  toast: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock('@/entities/board/api/board-mutations', () => ({
  useIssueBoardInvitationMutation: () => ({ mutateAsync, isPending: false }),
  useUploadBoardInvitationPreviewMutation: () => ({ mutateAsync: uploadPreview }),
}));
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
});
