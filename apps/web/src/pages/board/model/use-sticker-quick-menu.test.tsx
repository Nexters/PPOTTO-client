import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useStickerQuickMenu } from './use-sticker-quick-menu';

vi.mock('./use-rename-sticker', () => ({
  useRenameSticker: () => ({ rename: vi.fn() }),
}));

function QuickMenuHarness() {
  const { titleInputRef, isRenamingTitle, startRename } = useStickerQuickMenu('board-1');

  return (
    <>
      <input ref={titleInputRef} readOnly={!isRenamingTitle} />
      <button type="button" onClick={startRename}>
        이름 변경하기
      </button>
    </>
  );
}

describe('useStickerQuickMenu', () => {
  afterEach(() => vi.restoreAllMocks());

  it('이름 변경 클릭 시 readOnly를 해제한 뒤 input에 focus한다', () => {
    let wasReadOnlyOnFocus = true;
    vi.spyOn(HTMLInputElement.prototype, 'focus').mockImplementation(function (
      this: HTMLInputElement,
    ) {
      wasReadOnlyOnFocus = this.readOnly;
    });
    render(<QuickMenuHarness />);

    fireEvent.click(screen.getByRole('button', { name: '이름 변경하기' }));

    expect(wasReadOnlyOnFocus).toBe(false);
  });
});
