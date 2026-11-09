export const INVITATION_PREVIEW_WIDTH = 312;
export const INVITATION_PREVIEW_HEIGHT = 270;
export const INVITATION_PREVIEW_PIXEL_RATIO = 2;

export const INVITATION_PREVIEW_SCALE = 0.528;

type ContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function computeInvitationPreviewCamera(bounds: ContentBounds | null) {
  const centerX = bounds ? (bounds.minX + bounds.maxX) / 2 : 0;
  const centerY = bounds ? (bounds.minY + bounds.maxY) / 2 : 0;

  return {
    scale: INVITATION_PREVIEW_SCALE,
    x: INVITATION_PREVIEW_WIDTH / 2 - centerX * INVITATION_PREVIEW_SCALE,
    y: INVITATION_PREVIEW_HEIGHT / 2 - centerY * INVITATION_PREVIEW_SCALE,
  };
}
