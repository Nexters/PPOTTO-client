import { describe, expect, it } from 'vitest';

import { blobToBase64 } from './blob-to-base64';

describe('blobToBase64', () => {
  it('Blob을 base64 문자열로 변환한다', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });

    const result = await blobToBase64(blob);

    expect(result).toBe(btoa('hello'));
  });
});
