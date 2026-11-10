import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/shared/config/app-links';

const APP_OPEN_FALLBACK_MS = 1_500;

export function openAppWithStoreFallback(appUrl: string) {
  const storeUrl = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? APP_STORE_URL : GOOGLE_PLAY_URL;

  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelFallback = () => {
    if (fallbackTimer) clearTimeout(fallbackTimer);
    fallbackTimer = null;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', cancelFallback);
  };
  const onVisibilityChange = () => {
    if (document.hidden) cancelFallback();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', cancelFallback);
  fallbackTimer = setTimeout(() => {
    cancelFallback();
    window.location.href = storeUrl;
  }, APP_OPEN_FALLBACK_MS);
  window.location.href = appUrl;

  return cancelFallback;
}
