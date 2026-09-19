import { describe, expect, it } from 'vitest';

import { isRectFullyVisible, shouldShowBoardLoadError } from './BoardCanvas';

describe('shouldShowBoardLoadError', () => {
  it('데이터가 있으면 재조회가 실패해도 에러 화면을 보여주지 않는다', () => {
    expect(shouldShowBoardLoadError(true, { stickers: [] })).toBe(false);
  });

  it('데이터가 하나도 없는 상태에서 재조회가 실패하면 에러 화면을 보여준다', () => {
    expect(shouldShowBoardLoadError(true, undefined)).toBe(true);
  });
});

describe('isRectFullyVisible', () => {
  const containerRect = { left: 0, top: 0, right: 800, bottom: 600 };
  const padding = 16;

  it('rect가 패딩을 두고 컨테이너 안에 완전히 들어와 있으면 true를 반환한다', () => {
    const rect = { left: 100, top: 100, right: 200, bottom: 200 };
    expect(isRectFullyVisible(rect, containerRect, padding)).toBe(true);
  });

  it('rect가 패딩 경계에 정확히 걸쳐 있어도(경계 포함) true를 반환한다', () => {
    const rect = { left: 16, top: 16, right: 784, bottom: 584 };
    expect(isRectFullyVisible(rect, containerRect, padding)).toBe(true);
  });

  it.each([
    ['왼쪽', { left: 10, top: 100, right: 200, bottom: 200 }],
    ['위쪽', { left: 100, top: 10, right: 200, bottom: 200 }],
    ['오른쪽', { left: 100, top: 100, right: 790, bottom: 200 }],
    ['아래쪽', { left: 100, top: 100, right: 200, bottom: 590 }],
  ])('%s 모서리가 패딩 범위를 벗어나면 false를 반환한다', (_label, rect) => {
    expect(isRectFullyVisible(rect, containerRect, padding)).toBe(false);
  });
});
