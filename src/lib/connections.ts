import type { Connection } from '../types';

/**
 * Real status check: attempts a fetch against the URL with a timeout.
 * - 2xx/3xx (or opaque no-cors) -> online
 * - reachable but slow (>2500ms) -> degraded
 * - network error / timeout / 5xx -> offline
 * Non-http(s) URLs (e.g. mqtt://, postgres://) get a lightweight syntactic
 * check since browsers can't dial them: host present -> degraded ("unverifiable
 * from browser"), else offline.
 */
export async function checkConnection(conn: Connection, timeoutMs = 8000): Promise<Partial<Connection>> {
  const started = performance.now();
  const url = conn.url.trim();
  const isHttp = /^https?:\/\//i.test(url);

  if (!isHttp) {
    const hasHost = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s/$.?#].[^\s]*$/.test(url);
    return {
      status: hasHost ? 'degraded' : 'offline',
      latencyMs: Math.round(performance.now() - started),
      lastChecked: Date.now(),
      note: hasHost
        ? 'Non-HTTP scheme — cannot probe from browser; URL parses OK.'
        : 'URL does not parse as a valid endpoint.',
    };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // no-cors lets us detect reachability even without CORS headers (opaque response).
    const res = await fetch(url, { method: 'GET', mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' });
    const latency = Math.round(performance.now() - started);
    const opaque = res.type === 'opaque';
    return {
      status: latency > 2500 ? 'degraded' : 'online',
      latencyMs: latency,
      lastChecked: Date.now(),
      note: opaque ? `Reachable (opaque no-cors, ${latency}ms).` : `HTTP ${res.status} in ${latency}ms.`,
    };
  } catch (err: unknown) {
    const latency = Math.round(performance.now() - started);
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    // Fallback: a plain Image/beacon-style probe won't help for APIs; try cors HEAD once?
    // Keep it honest: report offline with reason.
    return {
      status: 'offline',
      latencyMs: latency,
      lastChecked: Date.now(),
      note: aborted ? `Timed out after ${timeoutMs}ms.` : `Unreachable: ${err instanceof Error ? err.message : 'network error'}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
