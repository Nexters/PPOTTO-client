import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardShareContent } from './BoardShareContent';

describe('BoardShareContent', () => {
  const renderContent = (overrides: Partial<Parameters<typeof BoardShareContent>[0]> = {}) => {
    const props = {
      hasStickers: true,
      isSaving: false,
      isSharingInstagram: false,
      isSharingKakao: false,
      onKakaoShare: vi.fn(),
      onInstagramShare: vi.fn(),
      onSaveImage: vi.fn(),
      onOpenScope: vi.fn(),
      ...overrides,
    };
    render(<BoardShareContent {...props} />);
    return props;
  };

  it('공유 방법을 누르면 각 동작을 실행한다', () => {
    const props = renderContent();

    fireEvent.click(screen.getByRole('button', { name: '카카오톡' }));
    fireEvent.click(screen.getByRole('button', { name: '인스타그램' }));
    fireEvent.click(screen.getByRole('button', { name: '이미지 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '공유 설정' }));

    expect(props.onKakaoShare).toHaveBeenCalledOnce();
    expect(props.onInstagramShare).toHaveBeenCalledOnce();
    expect(props.onSaveImage).toHaveBeenCalledOnce();
    expect(props.onOpenScope).toHaveBeenCalledOnce();
  });

  it('스티커가 없으면 공유 설정만 누를 수 있다', () => {
    renderContent({ hasStickers: false });

    expect(screen.getByRole('button', { name: '카카오톡' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '인스타그램' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '이미지 저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '공유 설정' })).toBeEnabled();
  });

  it('카카오톡 공유 동작이 없으면 카카오톡을 비활성화한다', () => {
    renderContent({ onKakaoShare: undefined });

    expect(screen.getByRole('button', { name: '카카오톡' })).toBeDisabled();
  });

  it('저장 중에는 저장 버튼을 막고 진행 문구를 표시한다', () => {
    renderContent({ isSaving: true });

    expect(screen.getByRole('button', { name: '저장 중...' })).toBeDisabled();
  });
});
