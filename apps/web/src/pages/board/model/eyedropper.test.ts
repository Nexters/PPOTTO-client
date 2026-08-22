/**
 * 동작 범위
 *
 * sampleColorAt: 캡처된 캔버스의 특정 좌표 픽셀 색을 hex로 읽는다. 좌표가 캔버스 범위를
 * 벗어나면(드래그가 캡처 영역 밖으로 나간 경우) 가장 가까운 가장자리 픽셀로 고정한다.
 * getContrastingIconColor: 배경색의 체감 밝기를 기준으로, 그 위에서 항상 구분되는
 * 검정/흰색 아이콘 색을 고른다.
 */
import { describe, expect, it } from 'vitest';

import { getContrastingIconColor, sampleColorAt } from './eyedropper';

describe('sampleColorAt', () => {
  function fakeCanvas(
    pixels: Record<string, [number, number, number, number]>,
    width = 10,
    height = 10,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext = ((id: string) => {
      if (id !== '2d') return null;
      return {
        getImageData: (x: number, y: number) => ({
          data: new Uint8ClampedArray(pixels[`${x},${y}`] ?? [0, 0, 0, 255]),
        }),
      };
    }) as typeof canvas.getContext;
    return canvas;
  }

  it('좌표의 픽셀 색을 hex로 반환한다', () => {
    const canvas = fakeCanvas({ '3,4': [255, 128, 0, 255] });

    expect(sampleColorAt(canvas, 3, 4)).toBe('#ff8000');
  });

  it('좌표를 반올림해서 픽셀을 읽는다', () => {
    const canvas = fakeCanvas({ '3,4': [10, 20, 30, 255] });

    expect(sampleColorAt(canvas, 2.6, 3.5)).toBe('#0a141e');
  });

  it('캔버스 범위를 벗어나면 가장 가까운 가장자리 픽셀로 고정한다', () => {
    const canvas = fakeCanvas({ '9,9': [1, 2, 3, 255] }, 10, 10);

    expect(sampleColorAt(canvas, 100, 100)).toBe('#010203');
  });

  it('음수 좌표는 0으로 고정한다', () => {
    const canvas = fakeCanvas({ '0,0': [9, 8, 7, 255] });

    expect(sampleColorAt(canvas, -5, -5)).toBe('#090807');
  });

  it('2d 컨텍스트를 가져올 수 없으면 null을 반환한다', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = (() => null) as typeof canvas.getContext;

    expect(sampleColorAt(canvas, 0, 0)).toBeNull();
  });
});

describe('getContrastingIconColor', () => {
  it('흰색 배경에는 검정 아이콘을 고른다', () => {
    expect(getContrastingIconColor('#ffffff')).toBe('#181818');
  });

  it('검정 배경에는 흰색 아이콘을 고른다', () => {
    expect(getContrastingIconColor('#000000')).toBe('#ffffff');
  });

  it('연노랑처럼 밝은 배경에는 검정 아이콘을 고른다', () => {
    expect(getContrastingIconColor('#fff697')).toBe('#181818');
  });

  it('진한 파랑처럼 어두운 배경에는 흰색 아이콘을 고른다', () => {
    expect(getContrastingIconColor('#1a1a4d')).toBe('#ffffff');
  });
});
