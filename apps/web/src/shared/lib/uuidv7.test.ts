import { describe, expect, it } from 'vitest';

import { uuidv7 } from './uuidv7';

const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('uuidv7', () => {
  it('표준 uuid 형식으로 반환한다', () => {
    expect(uuidv7()).toMatch(UUID_FORMAT);
  });

  it('버전 자리(3번째 그룹 첫 글자)가 7이다', () => {
    const [, , thirdGroup] = uuidv7().split('-');
    expect(thirdGroup?.[0]).toBe('7');
  });

  it('변형 자리(4번째 그룹 첫 글자)가 8/9/a/b 중 하나다', () => {
    const [, , , fourthGroup] = uuidv7().split('-');
    expect(['8', '9', 'a', 'b']).toContain(fourthGroup?.[0]);
  });

  it('호출할 때마다 서로 다른 id를 반환한다', () => {
    const ids = Array.from({ length: 100 }, () => uuidv7());
    expect(new Set(ids).size).toBe(100);
  });
});
