import { afterEach, describe, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/bridge', () => ({ bridge: { request } }));

import { saveImageToDevice } from './save-image-to-device';

describe('saveImageToDevice', () => {
  afterEach(() => {
    request.mockClear();
  });

  it('blob을 base64로 바꿔 SAVE_IMAGE를 요청하고 성공 여부를 반환한다', async () => {
    request.mockResolvedValue({ success: true });
    const blob = new Blob(['fake'], { type: 'image/png' });

    const result = await saveImageToDevice(blob);

    expect(request).toHaveBeenCalledWith('SAVE_IMAGE', { base64: expect.any(String) });
    expect(result).toBe(true);
  });

  it('네이티브 저장이 실패하면 false를 반환한다', async () => {
    request.mockResolvedValue({ success: false });
    const blob = new Blob(['fake'], { type: 'image/png' });

    const result = await saveImageToDevice(blob);

    expect(result).toBe(false);
  });
});
