import { beforeEach, describe, expect, it, vi } from 'vitest';

const { trackScreen } = vi.hoisted(() => ({ trackScreen: vi.fn() }));

vi.mock('@/shared/lib/observability', () => ({ trackScreen }));

import { observabilityPlugin } from './observability-plugin';

type Activity = { name: string; isActive: boolean };

function createPlugin(activities: Activity[] = []) {
  const actions = { getStack: () => ({ activities }) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin = observabilityPlugin() as any;
  return { plugin, actions };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('observabilityPlugin', () => {
  it('push된 화면을 태깅한다', () => {
    const { plugin } = createPlugin();

    plugin.onPushed({ effect: { activity: { name: 'Board' } } });

    expect(trackScreen).toHaveBeenCalledWith('Board');
  });

  it('replace된 화면을 태깅한다', () => {
    const { plugin } = createPlugin();

    plugin.onReplaced({ effect: { activity: { name: 'Login' } } });

    expect(trackScreen).toHaveBeenCalledWith('Login');
  });

  it('초기 진입 시 활성 화면을 태깅한다', () => {
    const { plugin, actions } = createPlugin([
      { name: 'Login', isActive: false },
      { name: 'Board', isActive: true },
    ]);

    plugin.onInit({ actions });

    expect(trackScreen).toHaveBeenCalledExactlyOnceWith('Board');
  });

  it('pop 이후 돌아온 화면을 태깅한다', () => {
    const { plugin, actions } = createPlugin([
      { name: 'Board', isActive: true },
      { name: 'Recap', isActive: false },
    ]);

    plugin.onPopped({ actions });

    expect(trackScreen).toHaveBeenCalledExactlyOnceWith('Board');
  });

  it('활성 화면이 없으면 태깅하지 않는다', () => {
    const { plugin, actions } = createPlugin([{ name: 'Board', isActive: false }]);

    plugin.onInit({ actions });

    expect(trackScreen).not.toHaveBeenCalled();
  });
});
