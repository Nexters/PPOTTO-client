import { HyperDXRum } from '@hyperdx/otel-react-native';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

const apiKey = process.env.EXPO_PUBLIC_HYPERDX_API_KEY;
const beaconEndpoint =
  process.env.EXPO_PUBLIC_HYPERDX_BEACON_URL ?? 'https://otel.ppotto.co.kr/api/v2/spans';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

let initialized = false;

function resolveEnvironment() {
  if (apiUrl.includes('dev-api.ppotto.co.kr')) return 'development';
  if (apiUrl.includes('api.ppotto.co.kr')) return 'production';
  return 'local';
}

export function initObservability() {
  if (initialized || !apiKey) return;

  initialized = true;
  HyperDXRum.init({
    apiKey,
    beaconEndpoint,
    service: 'ppotto-mobile',
    deploymentEnvironment: resolveEnvironment(),
    networkHeadersCapture: true,
    networkBodyCapture: true,
    tracePropagationTargets: [/dev-api\.ppotto\.co\.kr/, /api\.ppotto\.co\.kr/],
  });
}

export function identifyUser(userId: string) {
  if (!initialized) return;
  HyperDXRum.setGlobalAttributes({ userId });
}

export function watchUserIdentity(queryClient: QueryClient, queryKey: QueryKey) {
  let lastUserId: string | undefined;

  const apply = () => {
    const id = queryClient.getQueryData<{ id?: string }>(queryKey)?.id;
    if (!id || id === lastUserId) return;
    lastUserId = id;
    identifyUser(id);
  };

  apply();
  return queryClient.getQueryCache().subscribe(apply);
}

export function recordBridgeFailure(channel: string, error: unknown) {
  if (!initialized) return;
  const message = error instanceof Error ? error.message : String(error);
  HyperDXRum.reportError(new Error(`bridge ${channel} 실패: ${message}`));
}

export function recordAuthFailure(stage: string, error: unknown) {
  if (!initialized) return;
  const message = error instanceof Error ? error.message : String(error);
  HyperDXRum.reportError(new Error(`auth ${stage} 실패: ${message}`));
}
