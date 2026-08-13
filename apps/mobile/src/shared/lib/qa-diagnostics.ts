import { isQaToolEnabled } from './qa-tool';

const WINDOW_MS = 15_000;
const MAX_EVENTS = 150;
const TEXT_LIMIT = 2_000;
const WEB_MESSAGE_PREFIX = '__QA_DIAGNOSTIC__:';
const SENSITIVE_KEY = /authorization|cookie|password|secret|token/i;

export type QaDiagnosticSource = 'rn' | 'web';
export type QaConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface QaNetworkDiagnostic {
  type: 'network';
  source: QaDiagnosticSource;
  at: number;
  method: string;
  url: string;
  status: number | null;
  durationMs?: number;
  requestBody?: string;
  responseBody?: string;
  error?: string;
}

export interface QaConsoleDiagnostic {
  type: 'console';
  source: QaDiagnosticSource;
  at: number;
  level: QaConsoleLevel;
  message: string;
}

export type QaDiagnostic = QaNetworkDiagnostic | QaConsoleDiagnostic;

const diagnosticBuffer: QaDiagnostic[] = [];
const nativeFetch = globalThis.fetch.bind(globalThis);

function trimDiagnosticBuffer(now: number) {
  const cutoff = now - WINDOW_MS;
  const recentDiagnostics = diagnosticBuffer
    .filter((event) => event.at >= cutoff)
    .slice(-MAX_EVENTS);
  diagnosticBuffer.splice(0, diagnosticBuffer.length, ...recentDiagnostics);
}

export function recordQaDiagnostic(event: QaDiagnostic) {
  diagnosticBuffer.push(event);
  trimDiagnosticBuffer(Date.now());
}

export function getQaDiagnostics(now = Date.now()) {
  trimDiagnosticBuffer(now);
  return diagnosticBuffer.map((event) => ({ ...event }));
}

export function clearQaDiagnostics() {
  diagnosticBuffer.length = 0;
}

function truncate(value: string) {
  return value.length > TEXT_LIMIT ? `${value.slice(0, TEXT_LIMIT)}…` : value;
}

export function sanitizeQaDiagnosticText(value: string) {
  const redact = (_key: string, item: unknown) => (SENSITIVE_KEY.test(_key) ? '[REDACTED]' : item);

  try {
    return truncate(JSON.stringify(JSON.parse(value), redact));
  } catch {
    return truncate(
      value
        .replace(/(Bearer\s+)[\w.+/=-]+/gi, '$1[REDACTED]')
        .replace(/((?:access|refresh)?_?token|password|secret)=([^&\s]+)/gi, '$1=[REDACTED]'),
    );
  }
}

function stringify(value: unknown) {
  if (typeof value === 'string') return sanitizeQaDiagnosticText(value);
  if (value instanceof Error) return sanitizeQaDiagnosticText(`${value.name}: ${value.message}`);
  try {
    return sanitizeQaDiagnosticText(JSON.stringify(value));
  } catch {
    return sanitizeQaDiagnosticText(String(value));
  }
}

function sanitizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.searchParams.forEach((_value, key) => {
      if (SENSITIVE_KEY.test(key)) url.searchParams.set(key, '[REDACTED]');
    });
    return truncate(url.toString());
  } catch {
    return sanitizeQaDiagnosticText(value);
  }
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function getHeaders(value: unknown) {
  try {
    return new Headers(value as HeadersInit | undefined);
  } catch {
    return new Headers();
  }
}

function shouldReadBody(headers: Headers) {
  const contentType = headers.get('content-type') ?? '';
  return /json|text|xml|x-www-form-urlencoded/i.test(contentType);
}

async function requestBody(input: unknown, init: unknown) {
  const inputRecord = getRecord(input);
  const initRecord = getRecord(init);
  const body = initRecord?.body ?? inputRecord?.body;
  const headers = getHeaders(initRecord?.headers ?? inputRecord?.headers);

  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return sanitizeQaDiagnosticText(body);
  if (!shouldReadBody(headers)) return `[${body.constructor?.name ?? 'binary'}]`;

  if (typeof Request !== 'undefined' && input instanceof Request) {
    try {
      return sanitizeQaDiagnosticText(await input.clone().text());
    } catch {
      return '[unavailable]';
    }
  }
  return stringify(body);
}

async function responseBody(response: Response) {
  if (!response.headers || typeof response.clone !== 'function') return undefined;
  if (!shouldReadBody(response.headers)) return undefined;
  try {
    return sanitizeQaDiagnosticText(await response.clone().text());
  } catch {
    return '[unavailable]';
  }
}

function requestMeta(input: unknown, init: unknown) {
  const inputRecord = getRecord(input);
  const initRecord = getRecord(init);
  return {
    method: String(initRecord?.method ?? inputRecord?.method ?? 'GET').toUpperCase(),
    url: sanitizeUrl(String(inputRecord?.url ?? input)),
  };
}

export async function captureQaFetch<ResponseType extends Response>(
  call: () => Promise<ResponseType>,
  input: unknown,
  init?: unknown,
) {
  if (!isQaToolEnabled()) return call();

  const at = Date.now();
  const meta = requestMeta(input, init);
  const event: QaNetworkDiagnostic = {
    type: 'network',
    source: 'rn',
    at,
    ...meta,
    status: null,
  };
  recordQaDiagnostic(event);
  void requestBody(input, init).then((body) => {
    event.requestBody = body;
  });

  try {
    const response = await call();
    event.status = response.status;
    event.durationMs = Date.now() - at;
    void responseBody(response).then((body) => {
      event.responseBody = body;
    });
    return response;
  } catch (error) {
    event.durationMs = Date.now() - at;
    event.error = stringify(error);
    throw error;
  }
}

export const qaFetch: typeof globalThis.fetch = (input, init) =>
  captureQaFetch(() => nativeFetch(input, init), input, init);

export function installRnConsoleDiagnostics() {
  if (!isQaToolEnabled()) return () => undefined;

  const runtimeConsole = globalThis.console;
  const levels: QaConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
  const originals = new Map<QaConsoleLevel, (...args: unknown[]) => void>();

  for (const level of levels) {
    const original = runtimeConsole[level].bind(runtimeConsole);
    originals.set(level, original);
    runtimeConsole[level] = (...args: unknown[]) => {
      recordQaDiagnostic({
        type: 'console',
        source: 'rn',
        at: Date.now(),
        level,
        message: args.map(stringify).join(' '),
      });
      original(...args);
    };
  }

  return () => {
    for (const [level, original] of originals) runtimeConsole[level] = original;
  };
}

function isConsoleLevel(value: unknown): value is QaConsoleLevel {
  return (
    value === 'log' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error' ||
    value === 'debug'
  );
}

export function recordWebQaDiagnosticMessage(data: string) {
  if (!isQaToolEnabled()) return false;
  if (!data.startsWith(WEB_MESSAGE_PREFIX)) return false;

  try {
    const payload = JSON.parse(data.slice(WEB_MESSAGE_PREFIX.length)) as Record<string, unknown>;
    const at = typeof payload.at === 'number' ? payload.at : Date.now();

    if (payload.type === 'console' && isConsoleLevel(payload.level)) {
      recordQaDiagnostic({
        type: 'console',
        source: 'web',
        at,
        level: payload.level,
        message: sanitizeQaDiagnosticText(String(payload.message ?? '')),
      });
    } else if (payload.type === 'network') {
      recordQaDiagnostic({
        type: 'network',
        source: 'web',
        at,
        method: String(payload.method ?? 'GET').toUpperCase(),
        url: sanitizeUrl(String(payload.url ?? '')),
        status: typeof payload.status === 'number' ? payload.status : null,
        durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : undefined,
        requestBody:
          payload.requestBody === undefined
            ? undefined
            : sanitizeQaDiagnosticText(String(payload.requestBody)),
        responseBody:
          payload.responseBody === undefined
            ? undefined
            : sanitizeQaDiagnosticText(String(payload.responseBody)),
        error:
          payload.error === undefined ? undefined : sanitizeQaDiagnosticText(String(payload.error)),
      });
    }
  } catch {
    // QA 진단 메시지는 앱 기능과 무관하므로 잘못된 값은 버린다.
  }
  return true;
}

export function formatQaDiagnostics(diagnostics: QaDiagnostic[]) {
  const text = diagnostics
    .map((event) => {
      const source = event.source.toUpperCase();
      const time = new Date(event.at).toISOString().slice(11, 23);
      if (event.type === 'console')
        return `${time} ${source} ${event.level.toUpperCase()} ${event.message}`;

      const result = event.error ?? event.status ?? 'PENDING';
      const details = [
        event.requestBody && `REQ ${event.requestBody}`,
        event.responseBody && `RES ${event.responseBody}`,
      ]
        .filter(Boolean)
        .join('\n');
      return `${time} ${source} ${event.method} ${event.url} → ${result}${details ? `\n${details}` : ''}`;
    })
    .join('\n');
  return text.length > 8_000 ? `${text.slice(0, 8_000)}…` : text;
}

export const WEB_QA_DIAGNOSTICS_SCRIPT = `
(function () {
  if (window.__qaDiagnosticsInstalled) return true;
  window.__qaDiagnosticsInstalled = true;
  var prefix = '${WEB_MESSAGE_PREFIX}';
  var post = function (payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(prefix + JSON.stringify(payload));
    }
  };
  var text = function (value) {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.name + ': ' + value.message;
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  };
  var body = function (value) {
    if (value == null) return undefined;
    if (typeof value === 'string') return value;
    return '[' + ((value.constructor && value.constructor.name) || 'binary') + ']';
  };
  var readResponse = function (response) {
    var contentType = response.headers.get('content-type') || '';
    if (!/json|text|xml|x-www-form-urlencoded/i.test(contentType)) return Promise.resolve(undefined);
    return response.clone().text().catch(function () { return '[unavailable]'; });
  };

  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
    var original = console[level].bind(console);
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      post({ type: 'console', at: Date.now(), level: level, message: args.map(text).join(' ') });
      original.apply(console, args);
    };
  });

  var originalFetch = window.fetch;
  window.fetch = function (input, init) {
    var at = Date.now();
    var request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    var url = request ? request.url : String(input);
    var method = String((init && init.method) || (request && request.method) || 'GET').toUpperCase();
    var requestBody = body(init && init.body);
    return originalFetch.apply(this, arguments).then(function (response) {
      readResponse(response).then(function (responseBody) {
        post({ type: 'network', at: at, method: method, url: url, status: response.status,
          durationMs: Date.now() - at, requestBody: requestBody, responseBody: responseBody });
      });
      return response;
    }, function (error) {
      post({ type: 'network', at: at, method: method, url: url, status: null,
        durationMs: Date.now() - at, requestBody: requestBody, error: text(error) });
      throw error;
    });
  };

  var xhrOpen = XMLHttpRequest.prototype.open;
  var xhrSend = XMLHttpRequest.prototype.send;
  var xhrMeta = new WeakMap();
  XMLHttpRequest.prototype.open = function (method, url) {
    xhrMeta.set(this, { method: String(method).toUpperCase(), url: String(url) });
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (requestBody) {
    var xhr = this;
    var meta = xhrMeta.get(xhr) || { method: 'GET', url: '' };
    var at = Date.now();
    xhr.addEventListener('loadend', function () {
      var responseBody;
      try {
        responseBody = !xhr.responseType || xhr.responseType === 'text'
          ? xhr.responseText
          : xhr.responseType === 'json' ? text(xhr.response) : undefined;
      } catch (_) {}
      post({ type: 'network', at: at, method: meta.method, url: xhr.responseURL || meta.url,
        status: xhr.status || null, durationMs: Date.now() - at,
        requestBody: body(requestBody), responseBody: responseBody });
    }, { once: true });
    return xhrSend.apply(this, arguments);
  };
  return true;
})();
`;
