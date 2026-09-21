/**
 * 동작 범위
 *
 * 리캡에서 보드로 돌아왔을 때 화면이 간헐적으로 사라지는 문제의 원인이 "스택이 비는 것"으로
 * 좁혀졌지만 재현 조건은 아직 특정하지 못했다. `summarizeStack`은 그 순간의 스택을 Sentry
 * breadcrumb·이벤트에 실을 수 있는 납작한 값으로 요약해, 사후에 이동 경로를 되짚게 해준다.
 *
 * 살아있는 액티비티 판정(`enter-active`·`enter-done`만 화면에 존재)은 안드로이드 뒤로가기가
 * 쓰는 기준과 같다. 빈 스택 판정도 이 기준을 그대로 따른다.
 *
 * Sentry 전송 자체는 SDK 책임이라 여기서 검증하지 않는다.
 */
import { describe, expect, it } from 'vitest';

import { countAliveActivities, summarizeStack, type StackActivitySnapshot } from './stack-summary';

function fakeActivity(
  overrides: Partial<StackActivitySnapshot> & Pick<StackActivitySnapshot, 'name'>,
): StackActivitySnapshot {
  return {
    isActive: false,
    isRoot: false,
    transitionState: 'enter-done',
    ...overrides,
  };
}

describe('countAliveActivities', () => {
  it('화면에 들어와 있는 액티비티만 센다', () => {
    const stack = {
      activities: [
        fakeActivity({ name: 'Board', transitionState: 'enter-done' }),
        fakeActivity({ name: 'Recap', transitionState: 'enter-active' }),
      ],
    };

    expect(countAliveActivities(stack)).toBe(2);
  });

  it('사라지는 중이거나 사라진 액티비티는 세지 않는다', () => {
    const stack = {
      activities: [
        fakeActivity({ name: 'Board', transitionState: 'enter-done' }),
        fakeActivity({ name: 'Recap', transitionState: 'exit-active' }),
        fakeActivity({ name: 'PhotoViewer', transitionState: 'exit-done' }),
      ],
    };

    expect(countAliveActivities(stack)).toBe(1);
  });

  it('모두 사라진 빈 스택은 0이다', () => {
    const stack = {
      activities: [fakeActivity({ name: 'Board', transitionState: 'exit-done' })],
    };

    expect(countAliveActivities(stack)).toBe(0);
  });
});

describe('summarizeStack', () => {
  it('활성 액티비티의 이름과 루트 여부를 담는다', () => {
    const stack = {
      activities: [
        fakeActivity({ name: 'Board', isRoot: true }),
        fakeActivity({ name: 'Recap', isActive: true }),
      ],
    };

    expect(summarizeStack(stack)).toMatchObject({ active: 'Recap', activeIsRoot: false });
  });

  it('활성 액티비티가 없으면 이름과 루트 여부가 비어 있다', () => {
    const stack = {
      activities: [fakeActivity({ name: 'Board', transitionState: 'exit-done' })],
    };

    expect(summarizeStack(stack)).toMatchObject({ active: null, activeIsRoot: null, depth: 0 });
  });

  it('스택을 전환 상태까지 붙여 한 줄로 늘어놓는다', () => {
    const stack = {
      activities: [
        fakeActivity({ name: 'Board', isRoot: true }),
        fakeActivity({ name: 'Recap', transitionState: 'exit-active' }),
      ],
    };

    expect(summarizeStack(stack).activities).toBe('Board:enter-done > Recap:exit-active');
  });
});
