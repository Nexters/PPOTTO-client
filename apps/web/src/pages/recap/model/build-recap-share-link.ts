'use server';

import type { ShareOptionKey } from '@/pages/recap/ui/RecapShareOptions';
import { signShareOptions } from '@/shared/lib/recap-share-signature';

export async function buildRecapShareLink(
  stickerId: string,
  options: Record<ShareOptionKey, boolean>,
): Promise<string> {
  const { o, sig } = signShareOptions(stickerId, options);
  const baseUrl = process.env.WEB_APP_URL ?? 'https://ppotto.co.kr';
  return `${baseUrl}/share/recap/${stickerId}?o=${o}&sig=${sig}`;
}
