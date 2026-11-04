import { createHash } from 'crypto';

export function jsonParse(input, fallback?) {
  try {
    return JSON.parse(input);
  } catch {
    return fallback || {};
  }
}

/**
 * A JSON column's value, whether the driver returned it parsed or as text.
 * Unlike `jsonParse`, an already-parsed object is returned as is.
 */
export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function sendError(res, description, status = 500) {
  return res.status(status).json({
    error: 'unauthorized',
    error_description: description
  });
}

export function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

export function getIp(req) {
  const ips = (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    ''
  ).split(',');

  return ips[0].trim();
}
