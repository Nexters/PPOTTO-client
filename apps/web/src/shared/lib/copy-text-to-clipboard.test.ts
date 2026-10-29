import { beforeEach, describe, expect, it, vi } from 'vitest';

import { copyTextToClipboard } from './copy-text-to-clipboard';

const writeText = vi.fn();

describe('copyTextToClipboard', () => {
  beforeEach(() => {
    writeText.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('텍스트를 시스템 클립보드에 기록한다', async () => {
    writeText.mockResolvedValue(undefined);

    await copyTextToClipboard('K7P2QX');

    expect(writeText).toHaveBeenCalledWith('K7P2QX');
  });

  it('클립보드 기록이 실패하면 호출자에게 오류를 전달한다', async () => {
    writeText.mockRejectedValue(new Error('denied'));

    await expect(copyTextToClipboard('K7P2QX')).rejects.toThrow('denied');
  });

  it('Clipboard API를 사용할 수 없으면 호출자에게 오류를 전달한다', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    await expect(copyTextToClipboard('K7P2QX')).rejects.toThrow('클립보드를 사용할 수 없습니다.');
  });
});
