let lastViewedRecapStickerId: string | null = null;

export function setLastViewedRecapSticker(stickerId: string) {
  lastViewedRecapStickerId = stickerId;
}

export function consumeLastViewedRecapSticker(): string | null {
  const stickerId = lastViewedRecapStickerId;
  lastViewedRecapStickerId = null;
  return stickerId;
}
