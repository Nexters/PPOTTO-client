import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppInstallPromptSheet } from './AppInstallPromptSheet';

const DISMISS_KEY = 'test.app-install-prompt-dismissed';

function renderAndWait(dismissKey?: string) {
  const result = render(<AppInstallPromptSheet dismissKey={dismissKey} />);
  act(() => {
    vi.advanceTimersByTime(3_000);
  });
  return result;
}

describe('AppInstallPromptSheet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('닫음 기록 이름이 없으면 닫아도 다음에 다시 띄운다', () => {
    const { unmount } = renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: '모바일 웹에서 볼래요' }));
    unmount();

    renderAndWait();

    expect(screen.getByText('뽀또 앱에서 더 많은 기능을 이용해보세요!')).toBeInTheDocument();
  });

  it('닫음 기록 이름이 있으면 한 번 닫은 뒤 다시 띄우지 않는다', () => {
    const { unmount } = renderAndWait(DISMISS_KEY);
    fireEvent.click(screen.getByRole('button', { name: '모바일 웹에서 볼래요' }));
    unmount();

    renderAndWait(DISMISS_KEY);

    expect(screen.queryByText('뽀또 앱에서 더 많은 기능을 이용해보세요!')).not.toBeInTheDocument();
  });
});
