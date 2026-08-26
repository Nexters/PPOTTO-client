import { fireEvent, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { StickerBadge } from './StickerBadge';

describe('StickerBadge', () => {
  it('재렌더 없이 입력 폭을 늘리고 blur 시 DOM 값을 제출한다', () => {
    const onSubmit = vi.fn();
    const onRender = vi.fn();
    const { container } = render(
      <Profiler id="sticker-badge" onRender={onRender}>
        <StickerBadge title="원래 제목" isEditing onSubmit={onSubmit} />
      </Profiler>,
    );

    const input = screen.getByRole('textbox');
    fireEvent.input(input, { target: { value: ' 새 제목 ' } });

    expect(input).toHaveValue(' 새 제목 ');
    expect(container.querySelector('span')).toHaveTextContent('새 제목');
    expect(onRender).toHaveBeenCalledOnce();

    fireEvent.blur(input);
    expect(onSubmit).toHaveBeenCalledWith('새 제목');
  });
});
