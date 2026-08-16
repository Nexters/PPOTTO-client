import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/sticker-raster', () => ({
  drawOutlinedSticker: vi.fn(),
  STICKER_OUTLINE_WIDTH: 3,
  useStickerImage: () => ({ naturalWidth: 320, naturalHeight: 160 }),
}));

import { drawOutlinedSticker } from '@/shared/lib/sticker-raster';

import { layoutRecapComments, RecapStickerVisual } from './RecapStickerVisual';

describe('RecapStickerVisual', () => {
  it('SVG 필터 대신 미리 래스터링한 Canvas를 표시한다', () => {
    const { container } = render(
      <RecapStickerVisual stickerId="s1" imageUrl="sticker.png" floatComments={[]} />,
    );
    const canvas = container.querySelector('canvas');

    expect(canvas).toHaveStyle({ width: '182px', height: '94px' });
    expect(drawOutlinedSticker).toHaveBeenCalledWith(
      canvas,
      expect.objectContaining({ naturalWidth: 320, naturalHeight: 160 }),
      176,
    );
    expect(container.querySelector('filter')).not.toBeInTheDocument();
  });

  it('말풍선 수에 맞춰 좌우를 나누고 같은 입력은 같은 위치에 배치한다', () => {
    for (const count of [2, 3, 4]) {
      const comments = Array.from({ length: count }, (_, index) => ({
        id: `c${index}`,
        content: `말풍선 ${index}`,
        posX: 0,
        posY: 0,
      }));
      const sizes = new Map(comments.map(({ id }) => [id, { width: 80, height: 32 }]));
      const first = layoutRecapComments('s1', comments, { width: 182, height: 94 }, sizes);
      const second = layoutRecapComments('s1', comments, { width: 182, height: 94 }, sizes);
      const sideCounts = [
        first.filter(({ posX }) => posX < 0).length,
        first.filter(({ posX }) => posX > 0).length,
      ].sort();

      expect(sideCounts).toEqual(count === 2 ? [1, 1] : count === 3 ? [1, 2] : [2, 2]);
      expect(first).toEqual(second);
    }
  });
});
