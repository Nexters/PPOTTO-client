import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useStickerQuickMenu } from './use-sticker-quick-menu';

vi.mock('./use-rename-sticker', () => ({
  useRenameSticker: () => ({ rename: vi.fn() }),
}));

function QuickMenuHarness() {
  const {
    quickMenuStickerId,
    openQuickMenu,
    startRenameFromQuickMenu,
    directEditStickerId,
    directEditInputRef,
    finishDirectEditFromBackdrop,
  } = useStickerQuickMenu('board-1');

  return (
    <>
      <button type="button" onClick={() => openQuickMenu('sticker-1')}>
        퀵메뉴 열기
      </button>
      {quickMenuStickerId && (
        <button type="button" onClick={startRenameFromQuickMenu}>
          이름 변경하기
        </button>
      )}
      {directEditStickerId && (
        <>
          <input ref={directEditInputRef} />
          <button type="button" onPointerDown={finishDirectEditFromBackdrop}>
            편집 종료
          </button>
        </>
      )}
    </>
  );
}

describe('useStickerQuickMenu', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('퀵메뉴에서 이름 변경을 누르면 새로 마운트된 편집 input에 포커스한다', () => {
    let wasReadOnlyOnFocus = true;
    const focus = vi.spyOn(HTMLInputElement.prototype, 'focus').mockImplementation(function (
      this: HTMLInputElement,
    ) {
      wasReadOnlyOnFocus = this.readOnly;
    });
    render(<QuickMenuHarness />);

    fireEvent.click(screen.getByRole('button', { name: '퀵메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '이름 변경하기' }));

    expect(wasReadOnlyOnFocus).toBe(false);
    expect(focus).toHaveBeenCalled();
  });

  it('편집 배경을 누르면 input을 blur한다', () => {
    const blur = vi.spyOn(HTMLInputElement.prototype, 'blur').mockImplementation(() => undefined);
    render(<QuickMenuHarness />);

    fireEvent.click(screen.getByRole('button', { name: '퀵메뉴 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '이름 변경하기' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: '편집 종료' }));

    expect(blur).toHaveBeenCalledOnce();
  });
});
