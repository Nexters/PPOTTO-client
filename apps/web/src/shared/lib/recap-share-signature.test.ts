import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { signShareOptions, verifyShareOptions } from './recap-share-signature';

const STICKER_ID = '01a01132-29d2-7004-b1fc-c7ceb257bca3';
const OPTIONS = { image: true, summary: true, themeAnalysis: false, themePhotos: true };

describe('recap-share-signature', () => {
  beforeEach(() => {
    process.env.RECAP_SHARE_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.RECAP_SHARE_SECRET;
  });

  test('서명한 옵션은 그대로 검증을 통과한다', () => {
    const { o, sig } = signShareOptions(STICKER_ID, OPTIONS);

    expect(verifyShareOptions(STICKER_ID, o, sig)).toEqual(OPTIONS);
  });

  test('옵션 값을 조작하면 검증에 실패한다', () => {
    const { o, sig } = signShareOptions(STICKER_ID, OPTIONS);
    const tampered = o[0] === '1' ? `0${o.slice(1)}` : `1${o.slice(1)}`;

    expect(verifyShareOptions(STICKER_ID, tampered, sig)).toBeNull();
  });

  test('다른 스티커의 서명을 그대로 재사용할 수 없다', () => {
    const { o, sig } = signShareOptions(STICKER_ID, OPTIONS);

    expect(verifyShareOptions('다른-스티커-id', o, sig)).toBeNull();
  });

  test('서명이나 옵션이 없으면 검증에 실패한다', () => {
    const { o, sig } = signShareOptions(STICKER_ID, OPTIONS);

    expect(verifyShareOptions(STICKER_ID, null, sig)).toBeNull();
    expect(verifyShareOptions(STICKER_ID, o, null)).toBeNull();
  });

  test('형식이 잘못된 옵션 문자열은 검증에 실패한다', () => {
    const { sig } = signShareOptions(STICKER_ID, OPTIONS);

    expect(verifyShareOptions(STICKER_ID, '11', sig)).toBeNull();
    expect(verifyShareOptions(STICKER_ID, 'abcd', sig)).toBeNull();
  });
});
