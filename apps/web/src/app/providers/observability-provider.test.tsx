import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { initObservability, identifyUser } = vi.hoisted(() => ({
  initObservability: vi.fn(),
  identifyUser: vi.fn(),
}));

vi.mock('@/shared/lib/observability', () => ({ initObservability, identifyUser }));

import { userQueryKeys } from '@/entities/user/api/user-query-keys';

import { ObservabilityProvider } from './observability-provider';

let queryClient: QueryClient;

function renderProvider() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ObservabilityProvider />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient();
});

describe('ObservabilityProvider', () => {
  it('마운트 시 관측을 초기화한다', () => {
    renderProvider();

    expect(initObservability).toHaveBeenCalledTimes(1);
  });

  it('아무것도 렌더링하지 않는다', () => {
    const { container } = renderProvider();

    expect(container).toBeEmptyDOMElement();
  });

  it('로그인 전에는 userId를 태깅하지 않는다', () => {
    renderProvider();

    expect(identifyUser).not.toHaveBeenCalled();
  });

  it('내 정보가 캐시에 들어오면 userId를 태깅한다', () => {
    renderProvider();

    queryClient.setQueryData(userQueryKeys.me(), { id: 'user-1' });

    expect(identifyUser).toHaveBeenCalledWith('user-1');
  });

  it('언마운트 후에는 태깅하지 않는다', () => {
    const { unmount } = renderProvider();

    unmount();
    queryClient.setQueryData(userQueryKeys.me(), { id: 'user-1' });

    expect(identifyUser).not.toHaveBeenCalled();
  });
});
