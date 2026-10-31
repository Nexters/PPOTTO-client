import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BoardShareScopeContent } from './BoardShareScopeContent';

describe('BoardShareScopeContent', () => {
  it('현재 공유 범위만 선택된 상태로 표시한다', () => {
    render(<BoardShareScopeContent scope="RECAP" onBack={vi.fn()} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: '리캡까지' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '보드만' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '테마 속 사진까지' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('범위를 누르면 선택한 범위를 전달한다', () => {
    const onSelect = vi.fn();
    render(<BoardShareScopeContent scope="RECAP" onBack={vi.fn()} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: '테마 속 사진까지' }));

    expect(onSelect).toHaveBeenCalledWith('PHOTOS');
  });

  it('뒤로가기를 누르면 공유하기 화면으로 돌아간다', () => {
    const onBack = vi.fn();
    render(<BoardShareScopeContent scope="BOARD" onBack={onBack} onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
