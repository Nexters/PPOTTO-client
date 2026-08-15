import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ push: vi.fn() }),
}));

vi.mock('@/entities/sticker/api/sticker-queries', () => ({
  useStickerQuery: () => ({ refetch: vi.fn() }),
}));

// next/image 전용 boolean prop은 DOM에 그대로 넘기면 경고가 나 제외
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: React.ComponentProps<'img'> & { fill?: boolean; unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- next/image 대체 mock이라 규칙 대상 아님
    <img {...props} />
  ),
}));

import { RecapPhotoGrid } from './RecapPhotoGrid';

function fakePhoto(overrides: Partial<StickerPhoto> = {}): StickerPhoto {
  return {
    id: 'photo-1',
    imageUrl: 'https://storage.googleapis.com/ppotto-photos/photo-1.jpg',
    takenAt: '2026-01-01T00:00:00Z',
    group: false,
    groupId: null,
    groupPhotos: [],
    ...overrides,
  };
}

describe('RecapPhotoGrid', () => {
  it('사진 개수만큼 이미지를 렌더링한다', () => {
    const photos = [fakePhoto({ id: 'a' }), fakePhoto({ id: 'b' }), fakePhoto({ id: 'c' })];

    const { container } = render(<RecapPhotoGrid stickerId="sticker-1" photos={photos} />);

    expect(container.querySelectorAll('img')).toHaveLength(3);
  });
});
