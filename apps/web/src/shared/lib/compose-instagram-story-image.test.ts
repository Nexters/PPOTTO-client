import { describe, expect, it } from 'vitest';

import { fitContain } from './compose-instagram-story-image';

describe('fitContain', () => {
  it('세로로 긴 원본은 세로를 꽉 채우고 좌우가 남는다', () => {
    const fit = fitContain(360, 1200, 1080, 1920);

    expect(fit.height).toBe(1920);
    expect(fit.width).toBe(576);
    expect(fit.x).toBe((1080 - 576) / 2);
    expect(fit.y).toBe(0);
  });

  it('납작한 원본은 가로를 꽉 채우고 상하가 남는다', () => {
    const fit = fitContain(360, 360, 1080, 1920);

    expect(fit.width).toBe(1080);
    expect(fit.height).toBe(1080);
    expect(fit.x).toBe(0);
    expect(fit.y).toBe((1920 - 1080) / 2);
  });
});
