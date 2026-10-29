export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('클립보드를 사용할 수 없습니다.');
  }

  await navigator.clipboard.writeText(text);
}
