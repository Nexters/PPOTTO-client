/**
 * 동작 범위
 *
 * 캔버스 픽셀은 한 번만 읽고, sampleColorAt은 저장된 픽셀에서 색을 찾는다. 좌표가 캔버스
 * 범위를 벗어나면(드래그가 캡처 영역 밖으로 나간 경우) 가장 가까운 가장자리로 고정한다.
 * getContrastingIconColor: 배경색의 체감 밝기를 기준으로, 그 위에서 항상 구분되는
 * 검정/흰색 아이콘 색을 고른다.
 */
import { describe, expect, it, vi } from 'vitest';

import { getContrastingIconColor, readCanvasPixels, sampleColorAt } from './eyedropper';

describe('sampleColorAt', () => {
  function fakePixels(
    pixels: Record<string, [number, number, number, number]>,
    width = 10,
    height = 10,
  ) {
    const data = new Uint8ClampedArray(width * height * 4);
    Object.entries(pixels).forEach(([point, color]) => {
      const [x, y] = point.split(',').map(Number);
      data.set(color, (y! * width + x!) * 4);
    });
    return { data, width, height };
  }

  it('좌표의 픽셀 색을 hex로 반환한다', () => {
    const pixels = fakePixels({ '3,4': [255, 128, 0, 255] });

    expect(sampleColorAt(pixels, 3, 4)).toBe('#ff8000');
  });

  it('좌표를 반올림해서 픽셀을 읽는다', () => {
    const pixels = fakePixels({ '3,4': [10, 20, 30, 255] });

    expect(sampleColorAt(pixels, 2.6, 3.5)).toBe('#0a141e');
  });

  it('캔버스 범위를 벗어나면 가장 가까운 가장자리 픽셀로 고정한다', () => {
    const pixels = fakePixels({ '9,9': [1, 2, 3, 255] }, 10, 10);

    expect(sampleColorAt(pixels, 100, 100)).toBe('#010203');
  });

  it('음수 좌표는 0으로 고정한다', () => {
    const pixels = fakePixels({ '0,0': [9, 8, 7, 255] });

    expect(sampleColorAt(pixels, -5, -5)).toBe('#090807');
  });

  it('캔버스 전체 픽셀을 한 번만 읽어 재사용한다', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 1;
    const getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]),
      width: 2,
      height: 1,
    }));
    canvas.getContext = (() => ({ getImageData })) as unknown as typeof canvas.getContext;

    const pixels = readCanvasPixels(canvas)!;

    expect(sampleColorAt(pixels, 0, 0)).toBe('#010203');
    expect(sampleColorAt(pixels, 1, 0)).toBe('#040506');
    expect(getImageData).toHaveBeenCalledTimes(1);
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
