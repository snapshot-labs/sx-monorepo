/**
 * Parses JSON without rounding integers above 2^53.
 *
 * Signed tallies and aggregates carry such integers, and a rounded value would
 * fail the signature check. A reviver cannot help (it already sees a double), so
 * integers of 16 or more digits are quoted in the raw text before parsing and come
 * back as strings for `BigInt`. Shorter integers are exact as numbers.
 *
 * Only digits in a JSON value position (after `:`, `[` or `,`, before `,`, `]` or
 * `}`) match, so digits inside strings are left alone.
 */
const OVERSIZED_INTEGER = /(?<=[:[,]\s*)(\d{16,})(?=\s*[,\]}])/g;

export function parseJsonPreservingBigInts<T = any>(raw: string): T {
  return JSON.parse(raw.replace(OVERSIZED_INTEGER, '"$1"'));
}

/**
 * `JSON.stringify` that writes a `bigint` as a plain JSON number instead of
 * throwing.
 */
export function stringifyPreservingBigInts(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    typeof v === 'bigint' ? `__bigint__${v}` : v
  ).replace(/"__bigint__(\d+)"/g, '$1');
}
