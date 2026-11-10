import { APP_SCHEME } from '@/shared/config/app-links';
import { openAppWithStoreFallback } from '@/shared/lib/open-app-with-store-fallback';

export function openBoardInvitationInApp(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  openAppWithStoreFallback(`${APP_SCHEME}://invitations/${encodeURIComponent(normalizedCode)}`);
}
