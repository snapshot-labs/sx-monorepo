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

import fetch from 'node-fetch';
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
 * GET from the hub, passing its status through unchanged (for example 404 for an
 * unknown proposal, 503 when private voting is not configured).
 */
export async function hubGet<T>(path: string): Promise<T> {
  const url = `${hubBase()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      timeout: TIMEOUT_MS,
      headers: { accept: 'application/json' }
    });
  } catch (err: any) {
    // 502, not 500: an unreachable hub is retryable and not a bug here.
    logUpstream('GET', path, 502, `unreachable: ${err?.message || err}`);
    throw new HubError(`hub unreachable: ${err?.message || err}`, 502);
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // On an error status, a non-JSON body still gives a status-only error below.
    if (res.ok) throw new HubError('hub returned a non-JSON body', 502);
  }

  if (!res.ok) {
    const detail =
      body?.error || body?.message || `hub responded ${res.status}`;
    logUpstream('GET', path, res.status, detail);
    throw new HubError(
      body?.error || body?.message || `hub responded ${res.status}`,
      res.status
    );
  }
  return body as T;
}

/**
 * POST to the hub, passing its status through unchanged. The coordinator handles
 * each differently: a 409 from a quorum race is harmless, while a 403 means a
 * misconfigured committee and stops the ceremony.
 *
 * Returns null for a 204 (no body), which is what the write routes expect.
 */
export async function hubPost<T>(
  path: string,
  payload: unknown
): Promise<T | null> {
  const url = `${hubBase()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      timeout: TIMEOUT_MS,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err: any) {
    logUpstream('POST', path, 502, `unreachable: ${err?.message || err}`);
    throw new HubError(`hub unreachable: ${err?.message || err}`, 502);
  }

  if (res.status === 204) return null;

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    if (res.ok) return null;
  }

  if (!res.ok) {
    logUpstream(
      'POST',
      path,
      res.status,
      body?.error || body?.message || `hub responded ${res.status}`
    );
    throw new HubError(
      body?.error || body?.message || `hub responded ${res.status}`,
      res.status
    );
  }
  return body as T;
}

/**
 * POST an already-serialised body unchanged.
 *
 * Used for the aggregate and the result: their integers can exceed a double's
 * exact range and are covered by a signature, so re-parsing would round them and
 * break the signature.
 */
export async function hubPostRaw(
  path: string,
  rawBody: string | undefined
): Promise<null> {
  if (typeof rawBody !== 'string') {
    throw new HubError('missing request body', 400);
  }
  const url = `${hubBase()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      timeout: TIMEOUT_MS,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: rawBody
    });
  } catch (err: any) {
    logUpstream('POST', path, 502, `unreachable: ${err?.message || err}`);
    throw new HubError(`hub unreachable: ${err?.message || err}`, 502);
  }

  if (res.status === 204 || res.ok) return null;

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* fall through to the status-only error */
  }
  throw new HubError(
    body?.error || body?.message || `hub responded ${res.status}`,
    res.status
  );
}

/** GET a response as text, for the same precision reason as `hubPostRaw`. */
export async function hubGetRaw(path: string): Promise<string> {
  const url = `${hubBase()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      timeout: TIMEOUT_MS,
      headers: { accept: 'application/json' }
    });
  } catch (err: any) {
    logUpstream('GET', path, 502, `unreachable: ${err?.message || err}`);
    throw new HubError(`hub unreachable: ${err?.message || err}`, 502);
  }

  const text = await res.text();
  if (!res.ok) {
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* status-only error */
    }
    logUpstream(
      'GET',
      path,
      res.status,
      body?.error || body?.message || `hub responded ${res.status}`
    );
    throw new HubError(
      body?.error || body?.message || `hub responded ${res.status}`,
      res.status
    );
  }
  return text;
}
