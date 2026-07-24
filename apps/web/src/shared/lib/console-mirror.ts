/* eslint-disable no-console -- console 후킹이 이 파일의 역할 */
export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

const LEVELS: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
const MAX_LEN = 10_000;

function serialize(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
  if (arg === null || typeof arg !== 'object') return String(arg);
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(arg, (_k, v) => {
      if (v !== null && typeof v === 'object') {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    });
    return (json ?? String(arg)).slice(0, MAX_LEN);
  } catch {
    return String(arg);
  }
}

export function installConsoleMirror(
  forward: (level: LogLevel, args: string[]) => void,
): () => void {
  const original = {} as Record<LogLevel, (...args: unknown[]) => void>;
  let forwarding = false;

  for (const level of LEVELS) {
    original[level] = console[level];
    console[level] = (...args: unknown[]) => {
      original[level](...args);
      if (forwarding) return; // forward()가 다시 로그를 찍어도 재귀하지 않게
      forwarding = true;
      try {
        forward(level, args.map(serialize));
      } catch {
        // 미러링 실패가 원래 로그를 막지 않게
      } finally {
        forwarding = false;
      }
    };
  }

  return () => {
    for (const level of LEVELS) console[level] = original[level];
  };
}
