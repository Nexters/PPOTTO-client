import HyperDX from '@hyperdx/browser';

const apiKey = process.env.NEXT_PUBLIC_HYPERDX_API_KEY;
const ingestUrl = process.env.NEXT_PUBLIC_HYPERDX_URL ?? 'https://otel.ppotto.co.kr';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

let initialized = false;

function resolveEnvironment() {
  if (apiUrl.includes('dev-api.ppotto.co.kr')) return 'development';
  if (apiUrl.includes('api.ppotto.co.kr')) return 'production';
  return 'local';
}

export function initHyperDX() {
  if (initialized || typeof window === 'undefined') return;
  if (!apiKey) return;

  initialized = true;
  HyperDX.init({
    url: ingestUrl,
    apiKey,
    service: 'ppotto-web',
    tracePropagationTargets: [/dev-api\.ppotto\.co\.kr/, /api\.ppotto\.co\.kr/],
    consoleCapture: true,
    advancedNetworkCapture: true,
    disableReplay: true,
    otelResourceAttributes: { environment: resolveEnvironment() },
  });
}

export function identifyUser(userId: string) {
  if (!initialized) return;
  HyperDX.setGlobalAttributes({ userId });
}

export function trackScreen(activity: string) {
  if (!initialized) return;
  HyperDX.addAction('screen_view', { activity });
}

export function recordBridgeFailure(channel: string, error: unknown) {
  if (!initialized) return;
  HyperDX.recordException(error instanceof Error ? error : new Error(String(error)), {
    'bridge.channel': channel,
  });
}
