import { QueryClient } from '@tanstack/react-query';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { watchUserIdentity } from './user-identity.ts';

type Me = { id: string };

const queryKey = ['user', 'me'];

describe('watchUserIdentity', () => {
  let queryClient: QueryClient;
  let identified: string[];

  beforeEach(() => {
    queryClient = new QueryClient();
    identified = [];
  });

  const watch = () =>
    watchUserIdentity<Me>(queryClient, queryKey, (userId) => identified.push(userId));

  it('구독 시점에 이미 캐시에 있으면 즉시 태깅한다', () => {
    queryClient.setQueryData<Me>(queryKey, { id: 'user-1' });

    watch();

    assert.deepEqual(identified, ['user-1']);
  });

  it('구독 이후 캐시에 들어오면 태깅한다', () => {
    watch();
    assert.deepEqual(identified, []);

    queryClient.setQueryData<Me>(queryKey, { id: 'user-1' });

    assert.deepEqual(identified, ['user-1']);
  });

  it('같은 userId가 다시 들어와도 중복 태깅하지 않는다', () => {
    watch();

    queryClient.setQueryData<Me>(queryKey, { id: 'user-1' });
    queryClient.setQueryData<Me>(queryKey, { id: 'user-1' });

    assert.deepEqual(identified, ['user-1']);
  });

  it('계정이 바뀌면 새 userId로 태깅한다', () => {
    watch();

    queryClient.setQueryData<Me>(queryKey, { id: 'user-1' });
    queryClient.setQueryData<Me>(queryKey, { id: 'user-2' });

    assert.deepEqual(identified, ['user-1', 'user-2']);
  });

  it('구독을 해제하면 더 이상 태깅하지 않는다', () => {
    const unsubscribe = watch();

    unsubscribe();
    queryClient.setQueryData<Me>(queryKey, { id: 'user-1' });

    assert.deepEqual(identified, []);
  });

  it('다른 쿼리가 갱신돼도 태깅하지 않는다', () => {
    watch();

    queryClient.setQueryData(['boards'], [{ id: 'board-1' }]);

    assert.deepEqual(identified, []);
  });
});
