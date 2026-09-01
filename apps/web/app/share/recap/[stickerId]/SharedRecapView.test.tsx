import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { stickerFixture } from '@/entities/sticker/api/__fixtures__/sticker.fixture';

// fill은 next/image 전용 boolean prop이라 DOM에 그대로 넘기면 경고가 나 제외
vi.mock('next/image', () => ({
  default: ({ fill: _fill, ...props }: React.ComponentProps<'img'> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- next/image 대체 mock이라 규칙 대상 아님
    <img {...props} />
  ),
}));

import { SharedRecapView } from './SharedRecapView';

const options = {
  image: false,
  summary: false,
  themeAnalysis: false,
  themePhotos: true,
};

describe('SharedRecapView', () => {
  it('테마 사진 타일을 클릭하면 해당 사진이 크게보기로 열린다', async () => {
    const user = userEvent.setup();
    render(<SharedRecapView data={stickerFixture} options={options} />);

    await user.click(screen.getAllByRole('button')[0]!);

    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
  });

  it('닫기 버튼을 누르면 크게보기가 닫힌다', async () => {
    const user = userEvent.setup();
    render(<SharedRecapView data={stickerFixture} options={options} />);

    await user.click(screen.getAllByRole('button')[0]!);
    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(screen.queryByRole('button', { name: '닫기' })).not.toBeInTheDocument();
  });
});
