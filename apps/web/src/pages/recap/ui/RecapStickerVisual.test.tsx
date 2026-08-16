import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/sticker-raster', () => ({
  drawOutlinedSticker: vi.fn(),
  STICKER_OUTLINE_WIDTH: 3,
  useStickerImage: () => ({ naturalWidth: 320, naturalHeight: 160 }),
}));

import { drawOutlinedSticker } from '@/shared/lib/sticker-raster';

import { RecapStickerVisual } from './RecapStickerVisual';

describe('RecapStickerVisual', () => {
  it('SVG 필터 대신 미리 래스터링한 Canvas를 표시한다', () => {
    const { container } = render(<RecapStickerVisual imageUrl="sticker.png" floatComments={[]} />);
    const canvas = container.querySelector('canvas');

    expect(canvas).toHaveStyle({ width: '182px', height: '94px' });
    expect(drawOutlinedSticker).toHaveBeenCalledWith(
      canvas,
      expect.objectContaining({ naturalWidth: 320, naturalHeight: 160 }),
      176,
    );
    expect(container.querySelector('filter')).not.toBeInTheDocument();
  });
});
