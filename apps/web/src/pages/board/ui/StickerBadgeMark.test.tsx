import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/sticker-raster', () => ({
  useStickerImage: () => ({ naturalWidth: 320, naturalHeight: 160 }),
}));

import { StickerBadgeMark } from './StickerBadgeMark';
import type { StickerData } from './Sticker';

function fakeSticker(overrides: Partial<StickerData> = {}): StickerData {
  return {
    id: 'sticker-1',
    type: 'IMAGE',
    title: '제목',
    isNew: false,
    imageUrl: 'sticker.png',
    textContent: null,
    posX: 100,
    posY: 100,
    rotation: 0,
    scale: 1,
    zIndex: 1,
    badgeOffsetX: 0,
    badgeOffsetY: 0,
    ...overrides,
  };
}

describe('StickerBadgeMark', () => {
  it('data-sticker-id를 달아 스티커 본체와 동일하게 히트테스트되게 한다', () => {
    const { container } = render(
      <StickerBadgeMark sticker={fakeSticker()} isEditMode={false} opacity={1} />,
    );

    expect(container.querySelector('[data-sticker-id="sticker-1"]')).toBeInTheDocument();
  });

  it('일반 모드에서는 opacity를 그대로 반영하고 포인터 이벤트를 받는다', () => {
    const { container } = render(
      <StickerBadgeMark sticker={fakeSticker()} isEditMode={false} opacity={0.4} />,
    );

    expect(container.querySelector('[data-sticker-id]')).toHaveStyle({
      opacity: '0.4',
      pointerEvents: 'auto',
    });
  });

  it('편집 모드거나 완전히 투명하면 포인터 이벤트를 막는다', () => {
    const { container: editing } = render(
      <StickerBadgeMark sticker={fakeSticker()} isEditMode opacity={1} />,
    );
    expect(editing.querySelector('[data-sticker-id]')).toHaveStyle({ pointerEvents: 'none' });

    const { container: faded } = render(
      <StickerBadgeMark sticker={fakeSticker()} isEditMode={false} opacity={0} />,
    );
    expect(faded.querySelector('[data-sticker-id]')).toHaveStyle({ pointerEvents: 'none' });
  });
});
