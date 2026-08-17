import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/bridge', () => ({ bridge: { send, on: vi.fn() } }));

import { handleNavigateBack, setAliveActivityCountForTest } from './android-back';

describe('안드로이드 뒤로가기', () => {
  beforeEach(() => {
    send.mockClear();
    document.body.innerHTML = '';
  });

  it('열린 시트/모달이 있으면 ESC로 닫고 스택은 건드리지 않는다', () => {
    document.body.innerHTML = '<div role="dialog" data-state="open"></div>';
    const escListener = vi.fn();
    document.addEventListener('keydown', escListener);
    const pop = vi.fn();
    setAliveActivityCountForTest(2);

    handleNavigateBack(pop);

    expect(escListener).toHaveBeenCalledOnce();
    expect((escListener.mock.calls[0]![0] as KeyboardEvent).key).toBe('Escape');
    expect(pop).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('스택에 화면이 쌓여 있으면 pop한다', () => {
    const pop = vi.fn();
    setAliveActivityCountForTest(2);

    handleNavigateBack(pop);

    expect(pop).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });

  it('루트 화면이면 네이티브에 앱 이탈을 위임한다', () => {
    const pop = vi.fn();
    setAliveActivityCountForTest(1);

    handleNavigateBack(pop);

    expect(pop).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith('EXIT_APP');
  });

  it('닫힌 다이얼로그는 오버레이로 치지 않는다', () => {
    document.body.innerHTML = '<div role="dialog" data-state="closed"></div>';
    const pop = vi.fn();
    setAliveActivityCountForTest(2);

    handleNavigateBack(pop);

    expect(pop).toHaveBeenCalledOnce();
  });
});
