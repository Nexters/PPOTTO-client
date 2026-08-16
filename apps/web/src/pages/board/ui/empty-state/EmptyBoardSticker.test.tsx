import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EmptyBoardSticker,
  EMPTY_BOARD_STICKER_DEFAULT_TITLE,
  EMPTY_BOARD_STICKER_ID,
} from './EmptyBoardSticker';

describe('EmptyBoardSticker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const renderSticker = (isEditMode = false, transform = { x: 0, y: 0, rotation: 0, scale: 1 }) => {
    const onClick = vi.fn();
    const onLongPress = vi.fn();
    render(
      <EmptyBoardSticker
        title={EMPTY_BOARD_STICKER_DEFAULT_TITLE}
        isQuickMenuOpen={false}
        isEditMode={isEditMode}
        transform={transform}
        onClick={onClick}
        onLongPress={onLongPress}
      />,
    );
    return { onClick, onLongPress };
  };

  it('일반 클릭은 온보딩 동작만 실행한다', () => {
    const { onClick, onLongPress } = renderSticker();
    const sticker = screen.getByRole('img');

    fireEvent.pointerDown(sticker, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(sticker, { pointerId: 1 });
    fireEvent.click(sticker);

    expect(onClick).toHaveBeenCalledOnce();
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('롱프레스는 바텀시트 동작만 실행한다', () => {
    const { onClick, onLongPress } = renderSticker();
    const sticker = screen.getByRole('img');

    fireEvent.pointerDown(sticker, { pointerId: 1, clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(sticker, { pointerId: 1 });
    fireEvent.click(sticker);

    expect(onLongPress).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('이동 모드에서는 월드 좌표 변환을 표시하고 제스처 처리는 보드에 맡긴다', () => {
    const { onClick, onLongPress } = renderSticker(true, {
      x: 12,
      y: -8,
      rotation: 30,
      scale: 1.5,
    });
    const sticker = screen.getByRole('img');

    expect(sticker).toHaveAttribute('data-sticker-id', EMPTY_BOARD_STICKER_ID);
    expect(sticker).toHaveStyle({
      left: '12px',
      top: '-8px',
      transform: 'translate(-50%, -50%) rotate(30deg) scale(1.5)',
    });
    fireEvent.click(sticker);

    expect(onClick).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
