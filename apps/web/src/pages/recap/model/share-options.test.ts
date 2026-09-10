import { expect, it } from 'vitest';

import { decodeShareOptions, encodeShareOptions } from './share-options';

const ALL_ON = { image: true, summary: true, themeAnalysis: true, themePhotos: true };

it('옵션을 고정된 순서의 비트 문자열로 인코딩한다', () => {
  expect(encodeShareOptions({ ...ALL_ON, themePhotos: false })).toBe('1110');
  expect(encodeShareOptions({ ...ALL_ON, image: false, themeAnalysis: false })).toBe('0101');
});

it('인코딩한 값을 그대로 되돌린다', () => {
  const options = { ...ALL_ON, summary: false };

  expect(decodeShareOptions(encodeShareOptions(options))).toEqual(options);
});

it('값이 없거나 형식이 깨졌으면 전부 켜진 상태로 본다', () => {
  expect(decodeShareOptions(undefined)).toEqual(ALL_ON);
  expect(decodeShareOptions('')).toEqual(ALL_ON);
  expect(decodeShareOptions('111')).toEqual(ALL_ON);
  expect(decodeShareOptions('11112')).toEqual(ALL_ON);
  expect(decodeShareOptions('abcd')).toEqual(ALL_ON);
});
