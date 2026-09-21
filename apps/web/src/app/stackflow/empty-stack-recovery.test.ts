/**
 * 동작 범위
 *
 * 스택이 비면 아무 화면도 렌더되지 않아 보드가 사라진 것처럼 보인다. 루트 pop 가드가 막지 못하는
 * 경로(history-sync가 popstate를 받아 `Popped`를 직접 dispatch하는 등)까지 덮는 마지막 안전망이다.
 *
 * 앱이 뜨기 전에도 스택은 비어 있으므로, 한 번이라도 화면이 있었던 뒤에 비는 경우만 복구한다.
 * 복구 push가 화면을 만들지 못하는 상황에서 무한 재시도하지 않는 것도 이 판정의 책임이다.
 *
 * 실제 push와 Sentry 전송은 stackflow·SDK 책임이라 여기서 검증하지 않는다.
 */
import { describe, expect, it } from 'vitest';

import {
  initialEmptyStackRecoveryState,
  reduceEmptyStackRecovery,
  type EmptyStackRecoveryState,
} from './empty-stack-recovery';

const seenAndIdle: EmptyStackRecoveryState = { hasSeenActivity: true, isRecovering: false };

describe('reduceEmptyStackRecovery', () => {
  it('화면이 있으면 복구하지 않는다', () => {
    const result = reduceEmptyStackRecovery(seenAndIdle, 1);

    expect(result.shouldRecover).toBe(false);
  });

  it('화면이 있었다가 비면 복구한다', () => {
    const result = reduceEmptyStackRecovery(seenAndIdle, 0);

    expect(result.shouldRecover).toBe(true);
  });

  it('앱이 뜨기 전 빈 스택은 복구 대상이 아니다', () => {
    const result = reduceEmptyStackRecovery(initialEmptyStackRecoveryState, 0);

    expect(result.shouldRecover).toBe(false);
  });

  it('복구를 시작한 뒤 스택이 계속 비어 있어도 다시 복구하지 않는다', () => {
    const started = reduceEmptyStackRecovery(seenAndIdle, 0);

    const retried = reduceEmptyStackRecovery(started.state, 0);

    expect(retried.shouldRecover).toBe(false);
  });

  it('복구로 화면이 살아나면 다음 번 빈 스택을 다시 복구한다', () => {
    const started = reduceEmptyStackRecovery(seenAndIdle, 0);
    const recovered = reduceEmptyStackRecovery(started.state, 1);

    const emptiedAgain = reduceEmptyStackRecovery(recovered.state, 0);

    expect(emptiedAgain.shouldRecover).toBe(true);
  });
});
