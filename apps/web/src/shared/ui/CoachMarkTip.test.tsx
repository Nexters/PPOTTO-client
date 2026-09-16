import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CoachMarkTip } from './CoachMarkTip';

describe('CoachMarkTip', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = document.createElement('div');
    document.body.appendChild(anchor);
  });

  afterEach(() => {
    cleanup();
    anchor.remove();
    vi.restoreAllMocks();
  });

  it('anchor가 없으면 아무것도 렌더링하지 않는다', () => {
    render(<CoachMarkTip anchorElement={null} message="안내 문구" onDismiss={vi.fn()} />);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('anchor가 있으면 안내 문구를 보여준다', () => {
    render(
      <CoachMarkTip
        anchorElement={anchor}
        message="그림을 꾹 눌러서 삭제할 수 있어요."
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('tooltip')).toHaveTextContent('그림을 꾹 눌러서 삭제할 수 있어요.');
  });

  it('닫기 버튼을 누르면 onDismiss가 호출된다', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<CoachMarkTip anchorElement={anchor} message="안내 문구" onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: '닫기' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
