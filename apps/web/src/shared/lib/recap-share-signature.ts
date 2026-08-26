import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ShareOptionKey } from '@/pages/recap/ui/RecapShareOptions';

const SHARE_OPTION_ORDER: ShareOptionKey[] = ['image', 'summary', 'themeAnalysis', 'themePhotos'];

function encodeOptions(options: Record<ShareOptionKey, boolean>): string {
  return SHARE_OPTION_ORDER.map((key) => (options[key] ? '1' : '0')).join('');
}

function decodeOptions(encoded: string): Record<ShareOptionKey, boolean> | null {
  if (!new RegExp(`^[01]{${SHARE_OPTION_ORDER.length}}$`).test(encoded)) return null;
  return Object.fromEntries(
    SHARE_OPTION_ORDER.map((key, index) => [key, encoded[index] === '1']),
  ) as Record<ShareOptionKey, boolean>;
}

function sign(stickerId: string, encodedOptions: string): string {
  const secret = process.env.RECAP_SHARE_SECRET;
  if (!secret) throw new Error('RECAP_SHARE_SECRET이 설정되지 않았습니다');
  return createHmac('sha256', secret).update(`${stickerId}:${encodedOptions}`).digest('base64url');
}

export function signShareOptions(stickerId: string, options: Record<ShareOptionKey, boolean>) {
  const o = encodeOptions(options);
  return { o, sig: sign(stickerId, o) };
}

export function verifyShareOptions(
  stickerId: string,
  encoded: string | null,
  signature: string | null,
): Record<ShareOptionKey, boolean> | null {
  if (!encoded || !signature) return null;

  const decoded = decodeOptions(encoded);
  if (!decoded) return null;

  const expected = Buffer.from(sign(stickerId, encoded));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return decoded;
}
