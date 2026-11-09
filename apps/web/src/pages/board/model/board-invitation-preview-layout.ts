export const INVITATION_PREVIEW_WIDTH = 312;
export const INVITATION_PREVIEW_HEIGHT = 270;
export const INVITATION_PREVIEW_PIXEL_RATIO = 2;

export const INVITATION_PREVIEW_SCALE = 0.528;

export const KAKAO_SHARE_CARD_SIZE = 400;
export const KAKAO_SHARE_PIXEL_RATIO = 2;
export const KAKAO_SHARE_PREVIEW_WIDTH = 392;
export const KAKAO_SHARE_PREVIEW_HEIGHT = 332;
export const KAKAO_SHARE_PREVIEW_TOP = 89.5;
export const KAKAO_SHARE_PREVIEW_LEFT = 4;

type ContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function computeInvitationPreviewCamera(
  bounds: ContentBounds | null,
  width: number = INVITATION_PREVIEW_WIDTH,
  height: number = INVITATION_PREVIEW_HEIGHT,
) {
  const centerX = bounds ? (bounds.minX + bounds.maxX) / 2 : 0;
  const centerY = bounds ? (bounds.minY + bounds.maxY) / 2 : 0;

  return {
    scale: INVITATION_PREVIEW_SCALE,
    x: width / 2 - centerX * INVITATION_PREVIEW_SCALE,
    y: height / 2 - centerY * INVITATION_PREVIEW_SCALE,
  };
}
