export const KEYCARD_URL =
  import.meta.env.VITE_KEYCARD_URL || 'https://keycard.snapshot.org';

async function rpcCall(method: string, params: any) {
  const res = await fetch(KEYCARD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: null
    })
  });

  const { error, result } = await res.json();
  if (error) throw new Error(error.message || error);

  return result;
}

export async function createApiKey(params: {
  name: string;
  address: string;
}): Promise<{ key: string }> {
  return rpcCall('whitelist', params);
}
