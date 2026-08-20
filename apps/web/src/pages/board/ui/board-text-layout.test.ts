import { describe, expect, it } from 'vitest';

import { joinCharactersByVisualLine } from './board-text-layout';

describe('joinCharactersByVisualLine', () => {
  it('화면에서 다음 행으로 내려간 문자의 앞에 줄바꿈을 추가한다', () => {
    expect(
      joinCharactersByVisualLine([
        { character: '첫', top: 10 },
        { character: '줄', top: 10 },
        { character: '둘', top: 34 },
        { character: '째', top: 34 },
      ]),
    ).toBe('첫줄\n둘째');
  });

  it('같은 행 안의 미세한 위치 차이는 줄바꿈으로 취급하지 않는다', () => {
    expect(
      joinCharactersByVisualLine([
        { character: 'A', top: 10 },
        { character: 'B', top: 10.2 },
      ]),
    ).toBe('AB');
  });
});
