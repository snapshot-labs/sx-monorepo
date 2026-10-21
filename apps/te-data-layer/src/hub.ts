/**
 * HTTP client for the hub, the only store behind this service.
 *
 * Hub statuses must reach the caller unchanged. The protocol client maps them to
 * typed errors and the coordinator decides whether to retry or give up based on
 * them, so turning them all into 500 would break that logic:
 *
 *   404 → unknown election            (the client raises a lookup error)
 *   403 → not authorised to write
 *   409 → append-only violation / already finalised
 *   422 → write outside the permitted window or ordering
 *   400 → malformed request
 */

import log from './log';

export class HubError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function logUpstream(
  method: string,
  path: string,
  status: number,
  detail: string
): void {
  const line = `[te-dl] upstream ${method} hub${path} status=${status}: ${detail}`;

  if (status === 429) {
    log.error(
      `${line} — the hub rate-limited this request. All keyper and coordinator ` +
        "traffic shares this service's IP, so a throttled read makes keypers " +
        'fail to aggregate and the tally stalls reporting "unreachable". Raise ' +
        "the hub's limit for this service, or exempt it."
    );
    return;
  }

  if (status >= 500) log.error(line);
  else log.warn(line);
}

const TIMEOUT_MS = Number(process.env.HUB_TIMEOUT_MS || 10000);

function hubBase(): string {
  const url = process.env.HUB_URL;
  if (!url?.trim()) {
    throw new HubError('HUB_URL is not configured', 500);
  }
  return url.trim().replace(/\/+$/, '');
}

/**
 * Sends one request to the hub and returns the response body as text. The hub's
 * status is passed through unchanged with its error message (for example 404 for
 * an unknown proposal, 503 when private voting is not configured), so the
 * coordinator can handle each case. An unreachable or slow hub is a 502.
 */
async function forward(
  method: 'GET' | 'POST',
  path: string,
  body?: string
): Promise<string> {
  const url = `${hubBase()}${path}`;
  let res: Response;
  let text: string;
  try {
    res = await fetch(url, {
      method,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers:
        body === undefined
          ? { accept: 'application/json' }
          : { 'content-type': 'application/json', accept: 'application/json' },
      body
    });
    text = await res.text();
  } catch (err: any) {
    // 502, not 500: an unreachable hub is retryable and not a bug here.
    logUpstream(method, path, 502, `unreachable: ${err?.message || err}`);
    throw new HubError(`hub unreachable: ${err?.message || err}`, 502);
  }

  if (!res.ok) {
    let detail = `hub responded ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      detail = parsed?.error || parsed?.message || detail;
    } catch {
      // A non-JSON error body still gives a status-only error.
    }
    logUpstream(method, path, res.status, detail);
    throw new HubError(detail, res.status);
  }
  return text;
}

export async function hubGet<T>(path: string): Promise<T> {
  const text = await forward('GET', path);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HubError('hub returned a non-JSON body', 502);
  }
}

/** Returns null for an empty or non-JSON reply, such as the writes' 204. */
export async function hubPost<T>(
  path: string,
  payload: unknown
): Promise<T | null> {
  const text = await forward('POST', path, JSON.stringify(payload));
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

/**
 * POST an already-serialised body unchanged, and GET a reply as text. Used for the
 * aggregate and the result: their integers can exceed a double's exact range and
 * are covered by a signature, so re-parsing would round them and break it.
 */
export async function hubPostRaw(
  path: string,
  rawBody: string | undefined
): Promise<null> {
  if (typeof rawBody !== 'string') {
    throw new HubError('missing request body', 400);
  }
  await forward('POST', path, rawBody);
  return null;
}

export function hubGetRaw(path: string): Promise<string> {
  return forward('GET', path);
}
