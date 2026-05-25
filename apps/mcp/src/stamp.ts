const STAMP_URL = 'https://stamp.fyi';

async function stamp<T>(method: string, params: unknown): Promise<T> {
  const res = await fetch(STAMP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params })
  });
  if (!res.ok) throw new Error(`Stamp ${method} failed: ${res.status}`);
  return ((await res.json()) as { result: T }).result;
}

export async function lookupAddress(address: string): Promise<string | null> {
  const result = await stamp<Record<string, string>>('lookup_addresses', [
    address
  ]);
  return result[address] ?? null;
}
