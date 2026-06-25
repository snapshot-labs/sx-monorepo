export const MANA_URL =
  import.meta.env.VITE_MANA_URL || 'http://localhost:3000';

async function rpcCall(path: string, method: string, params: any) {
  const res = await fetch(`${MANA_URL}/${path}`, {
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

export async function executionCall(
  network: 'eth',
  chainId: number | string,
  method: 'sendAuctionPartner',
  params: any
) {
  return rpcCall(`${network}_rpc/${chainId}`, method, params);
}
