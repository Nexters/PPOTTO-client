import { describe, expect, it } from 'vitest';

import {
  computeInvitationPreviewCamera,
  INVITATION_PREVIEW_HEIGHT,
  INVITATION_PREVIEW_SCALE,
  INVITATION_PREVIEW_WIDTH,
} from './board-invitation-preview-layout';

describe('computeInvitationPreviewCamera', () => {
  it('콘텐츠 중심을 미리보기 프레임 중앙에 배치한다', () => {
    const bounds = { minX: 100, minY: 200, maxX: 500, maxY: 600 };
    const camera = computeInvitationPreviewCamera(bounds);

    expect(camera.x + 300 * camera.scale).toBeCloseTo(INVITATION_PREVIEW_WIDTH / 2);
    expect(camera.y + 400 * camera.scale).toBeCloseTo(INVITATION_PREVIEW_HEIGHT / 2);
  });

  it('콘텐츠가 멀리 퍼져 있어도 시안 배율을 유지한다', () => {
    const camera = computeInvitationPreviewCamera({
      minX: -10_000,
      minY: -10_000,
      maxX: 10_000,
      maxY: 10_000,
    });

    expect(camera.scale).toBe(INVITATION_PREVIEW_SCALE);
  });
});
