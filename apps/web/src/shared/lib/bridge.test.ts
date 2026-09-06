import { expect, it, vi } from 'vitest';

const send = vi.hoisted(() => vi.fn());
vi.mock('webview-bridge-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('webview-bridge-kit')>()),
  createWebBridge: () => ({ send }),
  webTransport: vi.fn(),
}));

import { track } from './bridge';

it('타입 지정 이벤트를 전달하고 전송 실패는 사용자 흐름에 전파하지 않는다', () => {
  track('login', { method: 'apple' });
  expect(send).toHaveBeenCalledWith('TRACK_ANALYTICS_EVENT', {
    name: 'login',
    params: { method: 'apple' },
  });
  send.mockImplementationOnce(() => {
    throw new Error('bridge unavailable');
  });
  expect(() => track('logout')).not.toThrow();
});
