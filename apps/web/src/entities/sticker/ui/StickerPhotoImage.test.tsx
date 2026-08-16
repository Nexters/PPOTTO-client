import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const refetch = vi.fn();

vi.mock('../api/sticker-queries', () => ({
  useStickerQuery: () => ({ refetch }),
}));

// fill은 next/image 전용 boolean prop이라 DOM에 그대로 넘기면 경고가 나 제외
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    unoptimized,
    ...props
  }: React.ComponentProps<'img'> & { fill?: boolean; unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- next/image 대체 mock이라 규칙 대상 아님
    <img {...props} data-unoptimized={String(unoptimized)} />
  ),
}));

import { StickerPhotoImage } from './StickerPhotoImage';

describe('StickerPhotoImage', () => {
  it('이미지 로드 실패 시 refetch를 호출한다', () => {
    refetch.mockClear();

    const { container } = render(
      <StickerPhotoImage stickerId="sticker-1" src="https://example.com/photo.jpg" alt="" fill />,
    );

    fireEvent.error(container.querySelector('img')!);

    // GCS 직접 로드는 CORS가 없어 캡처가 실패하므로 최적화 경로(/_next/image)로 서빙해야 한다
    expect(container.querySelector('img')).toHaveAttribute('data-unoptimized', 'undefined');
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
