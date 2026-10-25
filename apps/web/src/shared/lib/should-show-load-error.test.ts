import { describe, expect, it } from 'vitest';

import { shouldShowLoadError } from './should-show-load-error';

describe('shouldShowLoadError', () => {
  it('데이터가 있으면 재조회가 실패해도 에러 화면을 보여주지 않는다', () => {
    expect(shouldShowLoadError(true, { stickers: [] })).toBe(false);
  });

  it('데이터가 하나도 없는 상태에서 재조회가 실패하면 에러 화면을 보여준다', () => {
    expect(shouldShowLoadError(true, undefined)).toBe(true);
  });
});
