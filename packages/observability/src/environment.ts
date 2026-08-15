export type Environment = 'local' | 'development' | 'production';

const HOST_ENVIRONMENTS: Record<string, Environment> = {
  'dev-api.ppotto.co.kr': 'development',
  'api.ppotto.co.kr': 'production',
};

export function resolveEnvironment(apiUrl: string | undefined): Environment {
  if (!apiUrl) return 'local';

  try {
    return HOST_ENVIRONMENTS[new URL(apiUrl).hostname] ?? 'local';
  } catch {
    return 'local';
  }
}
