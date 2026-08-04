import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StickerPhoto } from '@/entities/sticker/api/sticker-api';

vi.mock('@stackflow/react', () => ({
  useFlow: () => ({ push: vi.fn() }),
}));

// fill은 next/image 전용 boolean prop이라 DOM에 그대로 넘기면 경고가 나 제외
vi.mock('next/image', () => ({
  default: ({ fill: _fill, ...props }: React.ComponentProps<'img'> & { fill?: boolean }) => (
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
    ...overrides,
  };
}

describe('RecapPhotoGrid', () => {
  it('사진 개수만큼 이미지를 렌더링한다', () => {
    const photos = [fakePhoto({ id: 'a' }), fakePhoto({ id: 'b' }), fakePhoto({ id: 'c' })];

    const { container } = render(<RecapPhotoGrid stickerId="sticker-1" photos={photos} />);

    expect(container.querySelectorAll('img')).toHaveLength(3);
  });

  it('이미지 로드 실패 시 onImageError를 호출한다', () => {
    const onImageError = vi.fn();

    const { container } = render(
      <RecapPhotoGrid stickerId="sticker-1" photos={[fakePhoto()]} onImageError={onImageError} />,
    );

    fireEvent.error(container.querySelector('img')!);

    expect(onImageError).toHaveBeenCalledTimes(1);
  });

  it('사진마다 로드 실패 시 각각 onImageError를 호출한다', () => {
    const onImageError = vi.fn();
    const photos = [fakePhoto({ id: 'a' }), fakePhoto({ id: 'b' })];

    const { container } = render(
      <RecapPhotoGrid stickerId="sticker-1" photos={photos} onImageError={onImageError} />,
    );

    const images = container.querySelectorAll('img');
    fireEvent.error(images[0]!);
    fireEvent.error(images[1]!);

    expect(onImageError).toHaveBeenCalledTimes(2);
  });

  it('onImageError를 안 넘겨도 로드 실패 시 에러가 나지 않는다', () => {
    const { container } = render(<RecapPhotoGrid stickerId="sticker-1" photos={[fakePhoto()]} />);

    expect(() => fireEvent.error(container.querySelector('img')!)).not.toThrow();
  });
});
