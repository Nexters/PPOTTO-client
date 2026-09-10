import type { ShareOptionKey } from '@/pages/recap/ui/RecapShareOptions';

const SHARE_OPTION_ORDER: ShareOptionKey[] = ['image', 'summary', 'themeAnalysis', 'themePhotos'];

const ALL_ENABLED = Object.fromEntries(SHARE_OPTION_ORDER.map((key) => [key, true])) as Record<
  ShareOptionKey,
  boolean
>;

export function encodeShareOptions(options: Record<ShareOptionKey, boolean>): string {
  return SHARE_OPTION_ORDER.map((key) => (options[key] ? '1' : '0')).join('');
}

// 표시 옵션일 뿐이라 서명하지 않는다. 조작해도 사진은 서버가 share_photos 로 막는다
export function decodeShareOptions(
  encoded: string | null | undefined,
): Record<ShareOptionKey, boolean> {
  if (!encoded || !new RegExp(`^[01]{${SHARE_OPTION_ORDER.length}}$`).test(encoded)) {
    return ALL_ENABLED;
  }
  return Object.fromEntries(
    SHARE_OPTION_ORDER.map((key, index) => [key, encoded[index] === '1']),
  ) as Record<ShareOptionKey, boolean>;
}
