export const WHITELIST_SERVER_URL = import.meta.env.VITE_WHITELIST_SERVER_URL;

async function rpcCall(method: string, params: any) {
  const res = await fetch(`${WHITELIST_SERVER_URL}`, {
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
  if (error) throw new Error('RPC call failed');

  return result;
}

export async function generateMerkleTree(params: {
  network: 'starknet';
  entries: string[];
}): Promise<string> {
  return rpcCall('generateMerkleTree', params);
}

export async function getMerkleRoot(params: {
  requestId: string;
}): Promise<string> {
  return rpcCall('getMerkleRoot', params);
}
