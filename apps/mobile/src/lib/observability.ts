import { HyperDXRum } from '@hyperdx/otel-react-native';
import { type Attributes, SpanStatusCode } from '@opentelemetry/api';
import { resolveEnvironment } from '@ppotto/observability';

const apiKey = process.env.EXPO_PUBLIC_HYPERDX_API_KEY;
const beaconEndpoint =
  process.env.EXPO_PUBLIC_HYPERDX_BEACON_URL ?? 'https://otel.ppotto.co.kr/api/v2/spans';
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

const TRACER_NAME = 'ppotto-mobile';

let initialized = false;

export function initObservability() {
  if (initialized || !apiKey) return;

  initialized = true;
  HyperDXRum.init({
    apiKey,
    beaconEndpoint,
    service: TRACER_NAME,
    deploymentEnvironment: resolveEnvironment(apiUrl),
    networkHeadersCapture: true,
    networkBodyCapture: true,
    tracePropagationTargets: [/dev-api\.ppotto\.co\.kr/, /api\.ppotto\.co\.kr/],
  });
}

export function identifyUser(userId: string) {
  if (!initialized) return;
  HyperDXRum.setGlobalAttributes({ userId });
}

function recordFailure(name: string, attributes: Attributes, error: unknown) {
  if (!initialized) return;

  const tracer = HyperDXRum.provider?.getTracer(TRACER_NAME);
  if (!tracer) return;

  const span = tracer.startSpan(name);
  span.setAttributes(attributes);
  span.recordException(error instanceof Error ? error : new Error(String(error)));
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.end();
}

export function recordBridgeFailure(channel: string, error: unknown) {
  recordFailure('bridge.failure', { 'bridge.channel': channel }, error);
}

export function recordAuthFailure(stage: string, error: unknown) {
  recordFailure('auth.failure', { 'auth.stage': stage }, error);
}
