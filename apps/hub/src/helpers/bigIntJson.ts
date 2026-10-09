/**
 * Re-reading a JSON body without losing large integers.
 *
 * `JSON.parse` maps every number onto a double, so an integer above 2^53 comes
 * back rounded — silently. For most payloads that is harmless. For a published
 * tally it is not: the totals are sums over weighted ballots, they are signed by
 * the result publisher, and the signature is verified by recomputing a digest
 * over those exact integers. A rounded total produces a different digest, so the
 * hub would reject a perfectly valid result and the election could never
 * publish — with an error that points at authorisation rather than at parsing.
 *
 * There is no reviver hook that can help: by the time a reviver sees a value it
 * is already a double. So the fix is to quote the oversized literals in the raw
 * text before parsing, turning them into strings the caller can hand to
 * `BigInt`. Sixteen digits is the threshold — 2^53 is sixteen digits, and
 * anything shorter is exactly representable.
 *
 * The pattern only matches a run of digits sitting where a JSON *value* can sit
 * (after `:`, `[` or `,`, and before `,`, `]` or `}`), so digits inside a string
 * — every hex field in these payloads is quoted — are left alone.
 */
const OVERSIZED_INTEGER = /(?<=[:[,]\s*)(\d{16,})(?=\s*[,\]}])/g;

export function parseJsonPreservingBigInts<T = any>(raw: string): T {
  return JSON.parse(raw.replace(OVERSIZED_INTEGER, '"$1"'));
}
