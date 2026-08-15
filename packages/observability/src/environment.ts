export type Environment = 'local' | 'development' | 'production';

const HOST_ENVIRONMENTS: Record<string, Environment> = {
  'dev-api.ppotto.co.kr': 'development',
  'api.ppotto.co.kr': 'production',
};

export const TRACE_PROPAGATION_TARGETS: RegExp[] = Object.keys(HOST_ENVIRONMENTS).map(
  (host) => new RegExp(host.replaceAll('.', '\\.')),
);

export function resolveEnvironment(apiUrl: string | undefined): Environment {
  if (!apiUrl) return 'local';

  try {
    return HOST_ENVIRONMENTS[new URL(apiUrl).hostname] ?? 'local';
  } catch {
    return 'local';
  }
}
