import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BoardInvitationContent } from './BoardInvitationContent';

describe('BoardInvitationContent', () => {
  it('발급받은 초대 코드와 공유 버튼을 표시한다', () => {
    render(<BoardInvitationContent code="K7P2QX" />);

    expect(screen.getByText('K7P2QX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카카오톡' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '인스타그램' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '복사' })).toBeDisabled();
  });
});
