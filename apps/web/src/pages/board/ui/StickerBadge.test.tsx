import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StickerBadge } from './StickerBadge';

describe('StickerBadge', () => {
  it('입력 중에는 원래 폭을 유지하고 blur 시 DOM 값을 제출한다', () => {
    const onSubmit = vi.fn();
    render(<StickerBadge title="원래 제목" isEditing onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.input(input, { target: { value: ' 새 제목 ' } });

    expect(input).toHaveValue(' 새 제목 ');
    expect(screen.getByText('원래 제목')).toBeInTheDocument();

    fireEvent.blur(input);
    expect(onSubmit).toHaveBeenCalledWith('새 제목');
  });
});
