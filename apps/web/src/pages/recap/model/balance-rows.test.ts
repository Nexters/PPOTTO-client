import { describe, expect, it } from 'vitest';

import { balanceIntoRows } from './balance-rows';

describe('balanceIntoRows', () => {
  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(balanceIntoRows([], 300, 8)).toEqual([]);
  });

  it('태그가 1개면 한 줄에 하나만 있다', () => {
    expect(balanceIntoRows([50], 300, 8)).toEqual([[0]]);
  });

  it('전부 한 줄에 들어가면 나누지 않고 한 줄로 반환한다', () => {
    expect(balanceIntoRows([40, 50, 60], 300, 8)).toEqual([[0, 1, 2]]);
  });

  it('앞에서부터 채우면 6개+2개로 쏠릴 너비 조합을, 줄 개수는 유지한 채 4개+4개로 재배치한다', () => {
    const widths = [40, 35, 50, 30, 45, 25, 60, 40];

    const result = balanceIntoRows(widths, 300, 8);

    expect(result).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
    ]);
  });

  it('유난히 넓은 태그가 섞여 있으면 그 태그를 자기 줄에 두고 나머지를 양옆에 나눈다', () => {
    const widths = [40, 40, 250, 40, 40];

    const result = balanceIntoRows(widths, 300, 8);

    expect(result).toEqual([[0, 1], [2], [3, 4]]);
  });

  it('너비가 전부 같으면 개수도 균등하게 나뉜다', () => {
    const widths = [50, 50, 50, 50, 50, 50];

    const result = balanceIntoRows(widths, 300, 8);

    expect(result).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });
});
