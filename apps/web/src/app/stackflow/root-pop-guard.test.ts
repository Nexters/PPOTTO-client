/**
 * 동작 범위
 *
 * 마지막 남은 화면까지 pop되면 스택이 비어 아무것도 렌더되지 않는다. stackflow core는 루트 pop을
 * 막지 않으므로(`Popped` 리듀서에 루트 검사 없음) 이 가드가 대신 막는다.
 *
 * 판정 기준은 "화면에 살아있는 액티비티 수"다. 사라지는 중(`exit-active`)인 액티비티는 이미 벗겨진
 * 것으로 보기 때문에, 리캡이 닫히는 애니메이션 도중 들어온 두 번째 pop도 차단 대상이 된다.
 *
 * 차단 시점의 Sentry 기록은 SDK 책임이라 여기서 검증하지 않는다.
 */
import { describe, expect, it } from 'vitest';

import { shouldPreventRootPop } from './root-pop-guard';
import type { StackActivitySnapshot } from './stack-summary';

function fakeActivity(
  overrides: Partial<StackActivitySnapshot> & Pick<StackActivitySnapshot, 'name'>,
): StackActivitySnapshot {
  return { isActive: false, isRoot: false, transitionState: 'enter-done', ...overrides };
}

describe('shouldPreventRootPop', () => {
  it('화면이 두 장 이상 쌓여 있으면 pop을 허용한다', () => {
    const stack = {
      activities: [
        fakeActivity({ name: 'Board', isRoot: true }),
        fakeActivity({ name: 'Recap', isActive: true }),
      ],
    };

    expect(shouldPreventRootPop(stack)).toBe(false);
  });

  it('마지막 한 장만 남았으면 pop을 차단한다', () => {
    const stack = {
      activities: [fakeActivity({ name: 'Board', isActive: true, isRoot: true })],
    };

    expect(shouldPreventRootPop(stack)).toBe(true);
  });

  it('리캡이 닫히는 도중 들어온 pop을 차단한다', () => {
    const stack = {
      activities: [
        fakeActivity({ name: 'Board', isActive: true, isRoot: true }),
        fakeActivity({ name: 'Recap', transitionState: 'exit-active' }),
      ],
    };

    expect(shouldPreventRootPop(stack)).toBe(true);
  });

  it('이미 비어 있는 스택에서도 pop을 차단한다', () => {
    const stack = {
      activities: [fakeActivity({ name: 'Board', transitionState: 'exit-done' })],
    };

    expect(shouldPreventRootPop(stack)).toBe(true);
  });

  it('화면 전환으로 교체되는 중이면 pop을 차단한다', () => {
    const stack = {
      activities: [
        fakeActivity({ name: 'AnalysisLoading', transitionState: 'exit-active' }),
        fakeActivity({
          name: 'Board',
          isActive: true,
          isRoot: true,
          transitionState: 'enter-active',
        }),
      ],
    };

    expect(shouldPreventRootPop(stack)).toBe(true);
  });
});
